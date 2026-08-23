"use server"

import { revalidatePath } from "next/cache"

import { promotionsActionClient } from "./action-client"
import { detectCollisions } from "../lib/collision"
import { hasPermission } from "../lib/permissions"
import {
  getTotalStores,
  listConditionCities,
  listActivePromotions,
} from "../lib/queries"
import {
  updatePromotionSchema,
  promotionSchema,
  simulatePromotionSchema,
  type PromotionValues,
} from "../schemas"
import type { Json } from "@/types/database.types"

function toRow(values: PromotionValues) {
  return {
    nombre: values.name,
    codigo: values.code,
    tipo: values.type,
    prioridad: values.priority,
    acumulable: values.stackable,
    canal_aplicacion: values.channelScope,
    combinador_condiciones: values.conditionCombinator,
    condiciones: values.conditions as unknown as Json,
    tipo_beneficio: values.benefitType,
    valor_beneficio: values.benefitValue,
    tope_maximo: values.maxCap ?? null,
    aplicar_sobre: values.applyTo,
    usos_por_cliente: values.usesPerMember ?? null,
    usos_periodo: values.usagePeriod ?? null,
    presupuesto_asignado: values.assignedBudget,
    vigente_desde: values.validFrom,
    vigente_hasta: values.validUntil || null,
    estado_publicacion: values.publicationStatus,
  }
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
    const [activePromotions, cities, totalStores] = await Promise.all([
      listActivePromotions(parsedInput.excludeId),
      listConditionCities(),
      getTotalStores(),
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

    return { ok: true as const, impactedStores, collisions }
  })
