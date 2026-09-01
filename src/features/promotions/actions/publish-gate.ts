import { requiresApproval } from "@/lib/approval-flow"
import type { createClient } from "@/lib/supabase/server"
import type {
  PromotionPublicationStatus,
  PromotionStatusChangeReason,
  SelectablePublicationStatus,
} from "@/types/domain"

import { logPromotionEvent, STATUS_EVENT_TYPE } from "./log-event"
import { PROMOTION_STATUS_LABEL } from "../lib/labels"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type PublishGateResult =
  | { ok: true; status: PromotionPublicationStatus; sentToApproval: boolean }
  | { ok: false; message: string }

/**
 * Único punto donde una promoción pasa a `activa` (o a `pendiente_aprobacion`
 * en su lugar) — lo consumen los cuatro caminos que pueden llegar ahí:
 * `createPromotionAction`, `updatePromotionAction`, `updatePromotionStatusAction`
 * y `activatePromotionsAction`. Centralizarlo evita que alguno de los cuatro
 * se quede publicando directo por no repetir el chequeo.
 *
 * Regla (`20260901100000_aprobacion_obligatoria.sql`): NINGUNA transición a
 * `activa` escribe `activa` — escribe `pendiente_aprobacion` y abre una
 * solicitud en `promotion_approval`. Cubre la primera publicación y también
 * la reactivación de una promoción pausada o finalizada; inactivar y
 * finalizar se guardan tal cual, porque no publican nada.
 *
 * Ya no hay excepción por rol: el atajo de `rol_base = 'admin'` se retiró.
 * El trigger de Postgres aplica lo mismo de todas formas (defensa en
 * profundidad ante un PATCH directo) — esto solo evita que la app misma
 * dispare esa excepción en el camino feliz.
 */
export async function applyPublicationTarget(
  ctx: {
    supabase: SupabaseClient
    orgId: string
    userId: string
    actorLabel: string
  },
  params: {
    promotionId: string
    from: PromotionPublicationStatus
    to: SelectablePublicationStatus
    reasonCode: PromotionStatusChangeReason
    reasonNote?: string
  }
): Promise<PublishGateResult> {
  // Cualquier entrada a `activa` abre solicitud, venga de `borrador` o de una
  // reactivación (`inactiva`/`finalizada`). Antes solo se gateaba la primera
  // publicación y solo para quien no fuera admin: las dos excepciones se
  // retiraron a propósito.
  const sendsToApproval = requiresApproval(params.to)

  const finalStatus: PromotionPublicationStatus = sendsToApproval
    ? "pendiente_aprobacion"
    : params.to

  const { error } = await ctx.supabase
    .from("promociones")
    .update({ estado_publicacion: finalStatus })
    .eq("id", params.promotionId)
  if (error) {
    return {
      ok: false,
      message: "No se pudo cambiar el estado de la promoción.",
    }
  }

  if (sendsToApproval) {
    const { error: approvalError } = await ctx.supabase
      .from("promotion_approval")
      .insert({
        org_id: ctx.orgId,
        promocion_id: params.promotionId,
        requested_by: ctx.userId,
        codigo_motivo: params.reasonCode,
        nota_motivo: params.reasonNote ?? null,
      })
    if (approvalError) {
      return {
        ok: false,
        message: "No se pudo crear la solicitud de aprobación.",
      }
    }
  }

  await logPromotionEvent(ctx, {
    promocionId: params.promotionId,
    tipo: STATUS_EVENT_TYPE[
      finalStatus as Exclude<PromotionPublicationStatus, "borrador">
    ],
    titulo: `${PROMOTION_STATUS_LABEL[params.from]} → ${PROMOTION_STATUS_LABEL[finalStatus]}`,
    codigoMotivo: params.reasonCode,
    notaMotivo: params.reasonNote,
    metadatos: { estado_anterior: params.from, estado_nuevo: finalStatus },
  })

  return { ok: true, status: finalStatus, sentToApproval: sendsToApproval }
}
