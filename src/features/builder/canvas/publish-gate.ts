import { requiresApproval } from "@/lib/approval-flow"
import type { PublicationStatus } from "@/lib/publication-status"
import type { createClient } from "@/lib/supabase/server"
import type { SelectablePublicationStatus } from "@/types/domain"

import { hasV2Schema, statusToDb } from "./schema-compat"
import { recordStatusEvent } from "./status-event"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export type WorkflowPublishGateResult =
  | { ok: true; estado: PublicationStatus; sentToApproval: boolean }
  | { ok: false; message: string }

/**
 * Único punto donde una regla pasa a `activa` (o a `pendiente_aprobacion`
 * en su lugar) — calco de `features/promotions/actions/publish-gate.ts`,
 * consumido por `publishWorkflowAction` y `changeWorkflowStatusAction`.
 *
 * Regla (`20260901100000_aprobacion_obligatoria.sql`): ninguna transición a
 * `activa` escribe `activa` — escribe `pendiente_aprobacion` y abre una
 * solicitud en `workflow_approval`. Cubre la primera publicación y la
 * reactivación, y no tiene excepción por rol: el atajo de admin se retiró.
 *
 * Sobre una base sin migrar (`legacy: true`, ver `schema-compat.ts`) el gate
 * no aplica — `pendiente_aprobacion` no existe en el vocabulario viejo ni en
 * su `check`, y la tabla `workflow_approval` tampoco. En ese caso publica
 * directo, igual que antes de esta migración.
 */
export async function applyWorkflowPublicationTarget(
  ctx: {
    supabase: SupabaseClient
    userId: string
  },
  params: {
    workflowId: string
    from: PublicationStatus
    to: SelectablePublicationStatus
    motivo: string
    nota: string
  }
): Promise<WorkflowPublishGateResult> {
  const legacy = !(await hasV2Schema(ctx.supabase))
  // Igual que en promociones: toda entrada a `activa` pasa por solicitud,
  // incluida la reactivación de una regla pausada, y sin excepción por rol.
  const sendsToApproval = !legacy && requiresApproval(params.to)

  const finalStatus = sendsToApproval ? "pendiente_aprobacion" : params.to

  const { error } = await ctx.supabase
    .from("workflows")
    .update({ estado: statusToDb(finalStatus, legacy) })
    .eq("id", params.workflowId)
  if (error) {
    return { ok: false, message: "No se pudo cambiar el estado de la regla." }
  }

  if (sendsToApproval) {
    const { error: approvalError } = await ctx.supabase
      .from("workflow_approval")
      .insert({
        workflow_id: params.workflowId,
        requested_by: ctx.userId,
        codigo_motivo: params.motivo,
        nota_motivo: params.nota || null,
      })
    if (approvalError) {
      return {
        ok: false,
        message: "No se pudo crear la solicitud de aprobación.",
      }
    }
  }

  await recordStatusEvent(ctx, {
    workflowId: params.workflowId,
    estadoAnterior: params.from,
    estadoNuevo: finalStatus,
    motivo: params.motivo,
    nota: params.nota,
  })

  return { ok: true, estado: finalStatus, sentToApproval: sendsToApproval }
}
