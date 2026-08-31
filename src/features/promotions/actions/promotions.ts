"use server"

import { revalidatePath } from "next/cache"

import { canPublishDirectly } from "@/lib/approval-flow"

import { promotionsActionClient } from "./action-client"
import { logPromotionEvent } from "./log-event"
import { applyPublicationTarget } from "./publish-gate"
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
  activatePromotionsSchema,
  deletePromotionsSchema,
  updatePromotionSchema,
  updatePromotionStatusSchema,
  promotionSchema,
  simulatePromotionSchema,
} from "../schemas"
import { getProgramParameters } from "@/lib/program-parameters"
import type { PromotionPublicationStatus } from "@/types/domain"

export const createPromotionAction = promotionsActionClient
  .inputSchema(promotionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "crear")) {
      return {
        ok: false as const,
        message: "No tienes permiso para crear promociones.",
      }
    }

    // Siempre nace en `borrador` — el trigger `promociones_insert_guard` lo
    // exige igual (`20260831090000_promociones_journeys_doble_aprobacion.sql`):
    // publicar directo desde el INSERT queda cerrado, así que el estado
    // elegido en el wizard se aplica DESPUÉS, con `applyPublicationTarget`,
    // que es quien decide si eso significa publicar o pedir aprobación.
    const { data, error } = await ctx.supabase
      .from("promociones")
      .insert({
        org_id: ctx.orgId,
        ...toRow(parsedInput),
        estado_publicacion: "borrador",
      })
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
      titulo: PROMOTION_STATUS_LABEL.borrador,
      metadatos: {
        codigo: parsedInput.code,
        estado_inicial: "borrador",
        mecanica: parsedInput.benefitType,
      },
    })

    if (parsedInput.publicationStatus !== "borrador") {
      const gate = await applyPublicationTarget(ctx, {
        promotionId: id,
        from: "borrador",
        to: parsedInput.publicationStatus,
        // El wizard de creación no pregunta un motivo aparte para el
        // estado inicial — mismo default que usa el diálogo de cambio de
        // estado (`PromotionStatusActions`) al abrirse.
        reasonCode: "decision_comercial",
      })
      if (!gate.ok) {
        return { ok: false as const, message: gate.message }
      }
    }

    revalidatePath("/promociones")
    return { ok: true as const, id }
  })

export const updatePromotionAction = promotionsActionClient
  .inputSchema(updatePromotionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para editar promociones.",
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

    // Igual que en `createPromotionAction`: el UPDATE deja el estado en
    // `borrador` (sin cambio real, así que el trigger de la migración de
    // aprobación ni interviene) y `applyPublicationTarget` se encarga
    // aparte de la transición, si el formulario pidió una.
    const { error } = await ctx.supabase
      .from("promociones")
      .update({ ...toRow(values), estado_publicacion: "borrador" })
      .eq("id", id)

    if (error) {
      const message =
        error.code === "23505"
          ? "Ya existe una promoción con ese código."
          : "No se pudo guardar la promoción."
      return { ok: false as const, message }
    }

    if (values.publicationStatus === "borrador") {
      await logPromotionEvent(ctx, {
        promocionId: id,
        tipo: "editada",
        titulo: "Borrador actualizado",
        metadatos: { estado_anterior: previous, estado_nuevo: "borrador" },
      })
    } else {
      const gate = await applyPublicationTarget(ctx, {
        promotionId: id,
        from: "borrador",
        to: values.publicationStatus,
        reasonCode: "decision_comercial",
      })
      if (!gate.ok) {
        return { ok: false as const, message: gate.message }
      }
    }

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
    if (!hasPermission(ctx.permissionsSet, "promociones", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para editar promociones.",
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
    // así el mensaje dice por qué.
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

    // `applyPublicationTarget` solo sustituye por `pendiente_aprobacion`
    // cuando `from === "borrador" && to === "activa"` — el resto de
    // transiciones que puede pedir esta acción (reactivar/inactivar/
    // finalizar) se guardan tal cual, como siempre.
    const gate = await applyPublicationTarget(ctx, {
      promotionId: parsedInput.id,
      from,
      to,
      reasonCode: parsedInput.reasonCode,
      reasonNote: parsedInput.reasonNote,
    })
    if (!gate.ok) {
      return { ok: false as const, message: gate.message }
    }

    revalidatePath("/promociones")
    revalidatePath(`/promociones/${parsedInput.id}/editar`)
    return { ok: true as const, publicationStatus: gate.status }
  })

export type ActivatePromotionsResult =
  | {
      ok: true
      activated: number
      sentToApproval: number
      skipped: { name: string; reason: string }[]
    }
  | { ok: false; message: string }

/**
 * Activa varias promociones a la vez desde el listado — el paso que sigue a
 * una importación (que las deja todas en `borrador`): revisar y publicar.
 *
 * Solo toca las que están en `borrador`; el resto se devuelven en `skipped`
 * con el motivo, en vez de fallar la operación entera o activarlas en
 * silencio. Igual que en el resto de caminos que llegan a `activa`
 * (`publish-gate.ts`), quien no puede publicar directo (`rolBase !== "admin"`)
 * no activa nada aquí: cada promoción del lote pasa a
 * `pendiente_aprobacion` con su propia solicitud — no una sola solicitud
 * para todo el lote, para que el aprobador pueda decidirlas una por una en
 * la bandeja. Se resuelve en bloque (un solo UPDATE/INSERT para todo el
 * lote) y no promoción por promoción porque la decisión ("¿publica
 * directo?") es la misma para las 200 — depende de quién ejecuta la
 * acción, no de cada fila.
 */
export const activatePromotionsAction = promotionsActionClient
  .inputSchema(activatePromotionsSchema)
  .action(async ({ parsedInput, ctx }): Promise<ActivatePromotionsResult> => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "editar")) {
      return {
        ok: false,
        message: "No tienes permiso para editar promociones.",
      }
    }

    const { data: rows, error: readError } = await ctx.supabase
      .from("promociones")
      .select("id, nombre, estado_publicacion")
      .in("id", parsedInput.ids)

    if (readError) {
      return { ok: false, message: "No se pudieron leer las promociones." }
    }

    const skipped: { name: string; reason: string }[] = []
    const activatable: { id: string; nombre: string }[] = []
    for (const row of rows ?? []) {
      const status = row.estado_publicacion as PromotionPublicationStatus
      if (status === "borrador") {
        activatable.push({ id: row.id, nombre: row.nombre })
      } else {
        skipped.push({
          name: row.nombre,
          reason: `ya está ${PROMOTION_STATUS_LABEL[status].toLowerCase()}`,
        })
      }
    }

    if (activatable.length === 0) {
      return { ok: true, activated: 0, sentToApproval: 0, skipped }
    }

    const ids = activatable.map((row) => row.id)
    const direct = canPublishDirectly(ctx.rolBase)
    const targetStatus = direct ? "activa" : "pendiente_aprobacion"

    const { error } = await ctx.supabase
      .from("promociones")
      .update({ estado_publicacion: targetStatus })
      .in("id", ids)

    if (error) {
      return { ok: false, message: "No se pudieron activar las promociones." }
    }

    if (!direct) {
      const { error: approvalError } = await ctx.supabase
        .from("promotion_approval")
        .insert(
          ids.map((promocionId) => ({
            org_id: ctx.orgId,
            promocion_id: promocionId,
            requested_by: ctx.userId,
            codigo_motivo: parsedInput.reasonCode,
            nota_motivo: parsedInput.reasonNote ?? null,
          }))
        )
      if (approvalError) {
        return {
          ok: false,
          message: "No se pudieron crear las solicitudes de aprobación.",
        }
      }
    }

    const detalle =
      parsedInput.ids.length > 1
        ? `${direct ? "Activación" : "Solicitud de aprobación"} masiva de ${activatable.length} promociones.`
        : undefined

    await Promise.all(
      activatable.map((row) =>
        logPromotionEvent(ctx, {
          promocionId: row.id,
          tipo: direct ? "activada" : "aprobacion_solicitada",
          titulo: direct
            ? `${PROMOTION_STATUS_LABEL.borrador} → ${PROMOTION_STATUS_LABEL.activa}`
            : PROMOTION_STATUS_LABEL.pendiente_aprobacion,
          detalle,
          codigoMotivo: parsedInput.reasonCode,
          notaMotivo: parsedInput.reasonNote,
          metadatos: {
            estado_anterior: "borrador",
            estado_nuevo: targetStatus,
          },
        })
      )
    )

    revalidatePath("/promociones")
    return {
      ok: true,
      activated: direct ? activatable.length : 0,
      sentToApproval: direct ? 0 : activatable.length,
      skipped,
    }
  })

export type DeletePromotionsResult =
  | { ok: true; deleted: number; skipped: { name: string; reason: string }[] }
  | { ok: false; message: string }

/**
 * Borra un lote de promociones EN BORRADOR — nunca una publicada: una
 * promoción que estuvo activa pudo aplicarse a un ticket real, y borrarla
 * dejaría esa historia sin referencia. Para esas está `finalizada`.
 *
 * No deja evento de bitácora a propósito: `promocion_eventos` tiene
 * `on delete cascade` sobre `promocion_id`, así que el evento se iría con
 * la fila. Un borrador nunca llegó a aplicarse, así que no hay historia
 * que preservar.
 */
export const deletePromotionsAction = promotionsActionClient
  .inputSchema(deletePromotionsSchema)
  .action(async ({ parsedInput, ctx }): Promise<DeletePromotionsResult> => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "eliminar")) {
      return {
        ok: false,
        message: "No tienes permiso para eliminar promociones.",
      }
    }

    const { data: rows, error: readError } = await ctx.supabase
      .from("promociones")
      .select("id, nombre, estado_publicacion")
      .in("id", parsedInput.ids)

    if (readError) {
      return { ok: false, message: "No se pudieron leer las promociones." }
    }

    const skipped: { name: string; reason: string }[] = []
    const deletable: string[] = []
    for (const row of rows ?? []) {
      if (row.estado_publicacion === "borrador") {
        deletable.push(row.id)
      } else {
        skipped.push({
          name: row.nombre,
          reason: `está ${PROMOTION_STATUS_LABEL[row.estado_publicacion as PromotionPublicationStatus].toLowerCase()} — solo se borran borradores`,
        })
      }
    }

    if (deletable.length === 0) {
      return { ok: true, deleted: 0, skipped }
    }

    const { error } = await ctx.supabase
      .from("promociones")
      .delete()
      .in("id", deletable)
      // Segundo cerrojo, en la propia sentencia: si el estado cambiara
      // entre la lectura y el borrado, la fila ya no coincide y no se borra.
      .eq("estado_publicacion", "borrador")

    if (error) {
      return { ok: false, message: "No se pudieron eliminar las promociones." }
    }

    revalidatePath("/promociones")
    return { ok: true, deleted: deletable.length, skipped }
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
