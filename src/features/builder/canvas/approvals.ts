"use server"

import { revalidatePath } from "next/cache"

import { builderActionClient } from "./action-client"
import { hasPermission } from "./permissions"
import { decideApprovalSchema, withdrawApprovalSchema } from "./schemas"
import { recordStatusEvent } from "./status-event"

/**
 * Aprueba una solicitud pendiente. `decide_workflow_approval` (SQL,
 * SECURITY DEFINER) hace la parte que no puede depender de este código: la
 * regla de cuatro ojos, el aislamiento por org (vía
 * `workflow_owned_by_current_org`) y la transición de la regla a `activa`
 * en una sola operación atómica — calco de
 * `features/promotions/actions/approvals.ts`.
 */
export const approveWorkflowApprovalAction = builderActionClient
  .inputSchema(decideApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "aprobar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aprobar reglas.",
      }
    }

    const { data: workflowId, error } = await ctx.supabase.rpc(
      "decide_workflow_approval",
      {
        p_approval_id: parsedInput.approvalId,
        p_decision: "approved",
        p_note: parsedInput.note || undefined,
      }
    )
    if (error || !workflowId) {
      return {
        ok: false as const,
        message: error?.message ?? "No se pudo aprobar la solicitud.",
      }
    }

    await recordStatusEvent(ctx, {
      workflowId,
      estadoAnterior: "pendiente_aprobacion",
      estadoNuevo: "activa",
      motivo: "decision_comercial",
      nota: parsedInput.note ?? "",
    })

    revalidatePath("/journeys")
    revalidatePath("/aprobaciones")
    revalidatePath(`/journeys/${workflowId}`)
    return { ok: true as const, workflowId: workflowId as string }
  })

/**
 * Rechaza una solicitud pendiente. `decide_workflow_approval` deja la regla
 * de vuelta en `borrador` — vuelve a ser editable.
 */
export const rejectWorkflowApprovalAction = builderActionClient
  .inputSchema(decideApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "aprobar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aprobar reglas.",
      }
    }

    const { data: workflowId, error } = await ctx.supabase.rpc(
      "decide_workflow_approval",
      {
        p_approval_id: parsedInput.approvalId,
        p_decision: "rejected",
        p_note: parsedInput.note || undefined,
      }
    )
    if (error || !workflowId) {
      return {
        ok: false as const,
        message: error?.message ?? "No se pudo rechazar la solicitud.",
      }
    }

    await recordStatusEvent(ctx, {
      workflowId,
      estadoAnterior: "pendiente_aprobacion",
      estadoNuevo: "borrador",
      motivo: "decision_comercial",
      nota: parsedInput.note ?? "",
    })

    revalidatePath("/journeys")
    revalidatePath("/aprobaciones")
    revalidatePath(`/journeys/${workflowId}`)
    return { ok: true as const, workflowId: workflowId as string }
  })

/**
 * Retira una solicitud propia mientras siga pendiente — solo quien la creó
 * puede hacerlo, no aplica la regla de cuatro ojos porque no es una
 * decisión de un aprobador distinto. Calco de
 * `features/promotions/actions/approvals.ts` `withdrawPromotionApprovalAction`.
 */
export const withdrawWorkflowApprovalAction = builderActionClient
  .inputSchema(withdrawApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: approval, error: approvalError } = await ctx.supabase
      .from("workflow_approval")
      .select("id, workflow_id, requested_by, status")
      .eq("id", parsedInput.approvalId)
      .maybeSingle()
    if (approvalError || !approval) {
      return {
        ok: false as const,
        message: "La solicitud de aprobación no existe.",
      }
    }
    if (approval.requested_by !== ctx.userId) {
      return {
        ok: false as const,
        message: "Solo quien solicitó la aprobación puede retirarla.",
      }
    }
    if (approval.status !== "pending") {
      return {
        ok: false as const,
        message: "Esta solicitud ya no está pendiente.",
      }
    }

    const { error: updateError } = await ctx.supabase
      .from("workflow_approval")
      .update({ status: "withdrawn", decided_at: new Date().toISOString() })
      .eq("id", approval.id)
    if (updateError) {
      return {
        ok: false as const,
        message: "No se pudo retirar la solicitud.",
      }
    }

    await ctx.supabase
      .from("workflows")
      .update({ estado: "borrador" })
      .eq("id", approval.workflow_id)
      .eq("estado", "pendiente_aprobacion")

    await recordStatusEvent(ctx, {
      workflowId: approval.workflow_id,
      estadoAnterior: "pendiente_aprobacion",
      estadoNuevo: "borrador",
      motivo: "decision_comercial",
      nota: "Solicitud retirada por quien la pidió.",
    })

    revalidatePath("/journeys")
    revalidatePath("/aprobaciones")
    return { ok: true as const }
  })
