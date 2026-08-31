import { canPublishDirectly } from "@/lib/approval-flow"
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
 * Regla (`20260831090000_promociones_journeys_doble_aprobacion.sql`): la
 * PRIMERA publicación (`borrador → activa`) de quien no es admin
 * (`current_rol_base()`, aquí `ctx.rolBase`) no escribe `activa` — escribe
 * `pendiente_aprobacion` y abre una solicitud en `promotion_approval`.
 * Cualquier otra transición (reactivar, inactivar, finalizar) no pasa por
 * esta regla y se guarda tal cual. El trigger de Postgres aplica lo mismo
 * de todas formas (defensa en profundidad ante un PATCH directo) — esto
 * solo evita que la app misma dispare esa excepción en el camino feliz.
 */
export async function applyPublicationTarget(
  ctx: {
    supabase: SupabaseClient
    orgId: string
    userId: string
    rolBase: string | null
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
  const sendsToApproval =
    params.from === "borrador" &&
    params.to === "activa" &&
    !canPublishDirectly(ctx.rolBase)

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
