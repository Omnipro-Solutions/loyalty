"use server"

import { revalidatePath } from "next/cache"

import { promotionsActionClient } from "./action-client"
import { detectCollisions } from "../lib/collision"
import { hasPermission } from "../lib/permissions"
import {
  evaluateProgramRules,
  SERVER_CONTEXT_RULE_IDS,
} from "../lib/program-rules"
import {
  getTotalStores,
  listConditionCities,
  listActivePromotions,
} from "../lib/queries"
import { toRow } from "../lib/to-row"
import {
  updatePromotionSchema,
  promotionSchema,
  simulatePromotionSchema,
  type PromotionValues,
} from "../schemas"
import { getProgramParameters } from "@/lib/program-parameters"
import type { createClient } from "@/lib/supabase/server"

const BELOW_COST_MESSAGE =
  "El precio especial queda por debajo del costo de adquisición — autoriza la venta bajo costo en el paso Economía (F12)."

/**
 * F12, crítica: "ninguna promoción vende por debajo del costo sin
 * autorización". Es la única regla del documento que exige un dato que
 * hoy no vive en `promociones` (`productos.costo_unitario`), así que no
 * puede ser un `superRefine` puro de `schemas.ts` — se recalcula aquí,
 * siempre en servidor, igual que el resto de checks de negocio de esta
 * Server Action.
 */
async function violatesSellingBelowCost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: PromotionValues
): Promise<boolean> {
  if (
    values.benefitType !== "precio_especial" ||
    values.autorizacionVentaBajoCosto ||
    values.precioPromocional === undefined ||
    !values.productoCompradoId
  ) {
    return false
  }
  const { data: product } = await supabase
    .from("productos")
    .select("costo_unitario")
    .eq("id", values.productoCompradoId)
    .maybeSingle()
  return (
    product?.costo_unitario !== null &&
    product?.costo_unitario !== undefined &&
    values.precioPromocional < product.costo_unitario
  )
}

export const createPromotionAction = promotionsActionClient
  .inputSchema(promotionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const requiredAction =
      parsedInput.publicationStatus === "activa" ? "aprobar" : "crear"
    if (!hasPermission(ctx.permissionsSet, "promociones", requiredAction)) {
      return {
        ok: false as const,
        message:
          requiredAction === "aprobar"
            ? "No tienes permiso para activar promociones — guárdala como borrador."
            : "No tienes permiso para crear promociones.",
      }
    }

    if (await violatesSellingBelowCost(ctx.supabase, parsedInput)) {
      return { ok: false as const, message: BELOW_COST_MESSAGE }
    }

    const { data, error } = await ctx.supabase
      .from("promociones")
      .insert({ org_id: ctx.orgId, ...toRow(parsedInput) })
      .select("id")
      .single()

    if (error || !data) {
      const message =
        error?.code === "23505"
          ? "Ya existe una promoción con ese código."
          : "No se pudo crear la promoción."
      return { ok: false as const, message }
    }

    revalidatePath("/promociones")
    return { ok: true as const, id: data.id as string }
  })

export const updatePromotionAction = promotionsActionClient
  .inputSchema(updatePromotionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const requiredAction =
      parsedInput.publicationStatus === "activa" ? "aprobar" : "editar"
    if (!hasPermission(ctx.permissionsSet, "promociones", requiredAction)) {
      return {
        ok: false as const,
        message:
          requiredAction === "aprobar"
            ? "No tienes permiso para activar promociones — guárdala como borrador."
            : "No tienes permiso para editar promociones.",
      }
    }

    if (await violatesSellingBelowCost(ctx.supabase, parsedInput)) {
      return { ok: false as const, message: BELOW_COST_MESSAGE }
    }

    const { id, ...values } = parsedInput
    const { error } = await ctx.supabase
      .from("promociones")
      .update(toRow(values))
      .eq("id", id)

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya existe una promoción con ese código."
          : "No se pudo guardar la promoción."
      return { ok: false as const, message }
    }

    revalidatePath("/promociones")
    revalidatePath(`/promociones/${id}/editar`)
    return { ok: true as const, id }
  })

export const simulatePromotionAction = promotionsActionClient
  .inputSchema(simulatePromotionSchema)
  .action(async ({ parsedInput }) => {
    const [activePromotions, cities, totalStores, programParameters] =
      await Promise.all([
        listActivePromotions(parsedInput.excludeId),
        listConditionCities(),
        getTotalStores(),
        getProgramParameters(),
      ])

    const storeCondition = parsedInput.conditions.find(
      (c) => c.campo === "tienda"
    )
    const impactedStores = storeCondition
      ? (cities.find((c) => c.city === storeCondition.valor)?.totalStores ?? 0)
      : totalStores

    const collisions = detectCollisions(
      {
        conditions: parsedInput.conditions,
        channelScope: parsedInput.channelScope,
        priority: parsedInput.priority,
      },
      activePromotions
    )

    // Solo S13/S14 salen de aquí: son las únicas que de verdad necesitan
    // datos de servidor. El resto de `evaluateProgramRules` (S04/S08/S21/
    // S24) ya las cubre `PromotionSummaryCard` en cliente con los valores
    // completos del formulario — este `parsedInput` no trae campos como
    // `registraUso`/`eventoGatillo`, así que evaluarlas aquí daría falsos
    // positivos además de duplicar la advertencia.
    const advisories = evaluateProgramRules(
      {
        benefitType: parsedInput.benefitType,
        benefitValue: parsedInput.benefitValue,
        stackable: parsedInput.stackable,
        exclusionGroup: parsedInput.exclusionGroup,
        priority: parsedInput.priority,
      },
      {
        activePromotions: activePromotions.map((p) => ({
          id: p.id,
          name: p.nombre,
          priority: p.prioridad,
          exclusionGroup: p.grupo_exclusion,
          stackable: p.acumulable,
          benefitType: p.tipo_beneficio,
          benefitValue: p.valor_beneficio,
        })),
        stackedDiscountCeilingPct: programParameters.techoDescuentoApiladoPct,
      }
    ).filter((issue) => SERVER_CONTEXT_RULE_IDS.includes(issue.rule))

    return { ok: true as const, impactedStores, collisions, advisories }
  })
