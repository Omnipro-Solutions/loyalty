"use server"

import { revalidatePath } from "next/cache"

import { DECISION_REASON_LABEL } from "@/lib/approval-flow"

import { builderActionClient } from "./action-client"
import { hasPermission } from "./permissions"
import { decideApprovalsSchema, withdrawApprovalSchema } from "./schemas"
import { recordStatusEvent } from "./status-event"

/**
 * Decide una o varias solicitudes. `decide_workflow_approvals` (SQL,
 * SECURITY DEFINER) aplica la regla de cuatro ojos fila a fila, el
 * aislamiento por org (vía `workflow_owned_by_current_org`) y la transición
 * de cada regla en una sola operación atómica — calco de
 * `features/promotions/actions/approvals.ts`, incluido el no fallar al
 * primer problema: lo que no se puede decidir sale en `skipped`.
 */
export const decideWorkflowApprovalsAction = builderActionClient
  .inputSchema(decideApprovalsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "aprobar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aprobar reglas.",
      }
    }

    const approved = parsedInput.decision === "approved"
    const { data, error } = await ctx.supabase.rpc(
      "decide_workflow_approvals",
      {
        p_approval_ids: parsedInput.approvalIds,
        p_decision: parsedInput.decision,
        p_codigo_decision: parsedInput.reasonCode,
        p_note: parsedInput.note?.trim() || undefined,
      }
    )
    if (error || !data) {
      return {
        ok: false as const,
        message: error?.message ?? "No se pudo decidir la solicitud.",
      }
    }

    const nota = [
      DECISION_REASON_LABEL[parsedInput.reasonCode],
      parsedInput.note?.trim(),
    ]
      .filter(Boolean)
      .join(" — ")

    for (const row of data.decided) {
      const workflowId = row.workflow_id as string
      await recordStatusEvent(ctx, {
        workflowId,
        estadoAnterior: "pendiente_aprobacion",
        estadoNuevo: approved ? "activa" : "borrador",
        motivo: "decision_comercial",
        nota,
      })
      revalidatePath(`/journeys/${workflowId}`)
    }

    revalidatePath("/journeys")
    revalidatePath("/aprobaciones")
    return {
      ok: true as const,
      decided: data.decided.length,
      skipped: data.skipped,
    }
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
