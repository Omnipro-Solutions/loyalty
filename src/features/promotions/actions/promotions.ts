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
import { PROMOTION_STATUS_LABEL } from "../lib/labels"
import { canTransitionStatus } from "../lib/status"
import { toRow } from "../lib/to-row"
import {
  updatePromotionSchema,
  updatePromotionStatusSchema,
  promotionSchema,
  simulatePromotionSchema,
} from "../schemas"
import { getProgramParameters } from "@/lib/program-parameters"
import type { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database.types"
import type {
  PromotionEventType,
  PromotionPublicationStatus,
} from "@/types/domain"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/** Estado → evento de bitácora que lo registra. `borrador` no aparece: ninguna transición vuelve a borrador (ver `ALLOWED_STATUS_TRANSITIONS`). */
const STATUS_EVENT_TYPE: Record<
  Exclude<PromotionPublicationStatus, "borrador">,
  PromotionEventType
> = {
  activa: "activada",
  inactiva: "inactivada",
  finalizada: "finalizada",
}

/**
 * Inserta una fila en `promocion_eventos` — la bitácora que alimenta
 * "Historial" en la vista de la promoción y "Logs" en el panel.
 *
 * Nunca hace fallar la acción que la llama: si la promoción se guardó pero
 * el evento no, perder la traza es mejor que dejar creer que el cambio no
 * ocurrió (la tabla es append-only, así que un reintento tampoco podría
 * corregirlo).
 */
async function logPromotionEvent(
  ctx: {
    supabase: SupabaseClient
    orgId: string
    userId: string
    actorLabel: string
  },
  event: {
    promocionId: string
    tipo: PromotionEventType
    titulo: string
    detalle?: string
    codigoMotivo?: string
    notaMotivo?: string
    metadatos?: Record<string, unknown>
  }
): Promise<void> {
  const { error } = await ctx.supabase.from("promocion_eventos").insert({
    org_id: ctx.orgId,
    promocion_id: event.promocionId,
    tipo: event.tipo,
    titulo: event.titulo,
    detalle: event.detalle ?? null,
    actor_tipo: "usuario",
    actor_id: ctx.userId,
    actor_etiqueta: ctx.actorLabel,
    codigo_motivo: event.codigoMotivo ?? null,
    nota_motivo: event.notaMotivo ?? null,
    metadatos: (event.metadatos ?? {}) as Json,
  })
  if (error) {
    console.error("No se pudo registrar el evento de la promoción", error)
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

    const id = data.id as string
    // "Quién creó y cuándo" sale de aquí, no de `promociones.creado_en`: la
    // columna guarda la fecha pero no el autor.
    await logPromotionEvent(ctx, {
      promocionId: id,
      tipo: "creada",
      titulo: `Creada como ${PROMOTION_STATUS_LABEL[parsedInput.publicationStatus]}`,
      metadatos: {
        codigo: parsedInput.code,
        estado_inicial: parsedInput.publicationStatus,
        mecanica: parsedInput.benefitType,
      },
    })

    revalidatePath("/promociones")
    return { ok: true as const, id }
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

    const { data: current } = await ctx.supabase
      .from("promociones")
      .select("estado_publicacion")
      .eq("id", id)
      .maybeSingle()
    if (!current) {
      return { ok: false as const, message: "No se encontró la promoción." }
    }

    // La regla "una vez creada, lo único editable es el estado" se aplica
    // aquí y no solo en el formulario: una Server Action es una superficie
    // pública, y `updatePromotionStatusAction` es el único camino para
    // cambiar el estado de una promoción ya publicada.
    const previous = current.estado_publicacion as PromotionPublicationStatus
    if (previous !== "borrador") {
      return {
        ok: false as const,
        message:
          "Esta promoción ya está publicada: sus campos son de solo lectura y solo se puede cambiar su estado.",
      }
    }

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

    const next = values.publicationStatus
    await logPromotionEvent(ctx, {
      promocionId: id,
      tipo: next === "borrador" ? "editada" : STATUS_EVENT_TYPE[next],
      titulo:
        next === "borrador"
          ? "Borrador actualizado"
          : `${PROMOTION_STATUS_LABEL[previous]} → ${PROMOTION_STATUS_LABEL[next]}`,
      metadatos: { estado_anterior: previous, estado_nuevo: next },
    })

    revalidatePath("/promociones")
    revalidatePath(`/promociones/${id}/editar`)
    return { ok: true as const, id }
  })

/**
 * Cambio de estado de una promoción ya creada — la única escritura que
 * admite una promoción publicada, porque sus campos son de solo lectura
 * (ver `promotion-form.tsx`). No reusa `updatePromotionAction`: aquí no hay
 * formulario que revalidar, solo la transición.
 */
export const updatePromotionStatusAction = promotionsActionClient
  .inputSchema(updatePromotionStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const requiredAction =
      parsedInput.publicationStatus === "activa" ? "aprobar" : "editar"
    if (!hasPermission(ctx.permissionsSet, "promociones", requiredAction)) {
      return {
        ok: false as const,
        message:
          requiredAction === "aprobar"
            ? "No tienes permiso para activar promociones."
            : "No tienes permiso para editar promociones.",
      }
    }

    const { data: current, error: readError } = await ctx.supabase
      .from("promociones")
      .select("estado_publicacion")
      .eq("id", parsedInput.id)
      .maybeSingle()

    if (readError || !current) {
      return {
        ok: false as const,
        message: "No se encontró la promoción.",
      }
    }

    const from = current.estado_publicacion as PromotionPublicationStatus
    const to = parsedInput.publicationStatus
    if (from === to) return { ok: true as const, publicationStatus: to }

    // Explícito además de `canTransitionStatus` (que también lo rechaza):
    // así el mensaje dice por qué, y `to` queda tipado sin `borrador` para
    // indexar `STATUS_EVENT_TYPE`.
    if (to === "borrador") {
      return {
        ok: false as const,
        message:
          "Una promoción ya publicada no puede volver a borrador — eso reabriría la edición de sus campos.",
      }
    }

    if (!canTransitionStatus(from, to)) {
      return {
        ok: false as const,
        message: `Una promoción ${PROMOTION_STATUS_LABEL[from].toLowerCase()} no puede pasar a ${PROMOTION_STATUS_LABEL[to].toLowerCase()}.`,
      }
    }

    const { error } = await ctx.supabase
      .from("promociones")
      .update({ estado_publicacion: to })
      .eq("id", parsedInput.id)

    if (error) {
      return {
        ok: false as const,
        message: "No se pudo cambiar el estado de la promoción.",
      }
    }

    await logPromotionEvent(ctx, {
      promocionId: parsedInput.id,
      tipo: STATUS_EVENT_TYPE[to],
      titulo: `${PROMOTION_STATUS_LABEL[from]} → ${PROMOTION_STATUS_LABEL[to]}`,
      codigoMotivo: parsedInput.reasonCode,
      notaMotivo: parsedInput.reasonNote,
      metadatos: { estado_anterior: from, estado_nuevo: to },
    })

    revalidatePath("/promociones")
    revalidatePath(`/promociones/${parsedInput.id}/editar`)
    return { ok: true as const, publicationStatus: to }
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
