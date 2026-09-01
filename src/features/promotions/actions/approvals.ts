"use server"

import { revalidatePath } from "next/cache"

import { DECISION_REASON_LABEL } from "@/lib/approval-flow"
import type { DecisionReason } from "@/types/domain"

import { promotionsActionClient } from "./action-client"
import { logPromotionEvent } from "./log-event"
import { hasPermission } from "../lib/permissions"
import { decideApprovalsSchema, withdrawApprovalSchema } from "../schemas"

/**
 * Decide una o varias solicitudes. `decide_promotion_approvals` (SQL,
 * SECURITY DEFINER) hace la parte que no puede depender de este código: la
 * regla de cuatro ojos fila a fila, el aislamiento por org y la transición
 * de cada promoción en una sola operación atómica.
 *
 * No falla al primer problema. Una solicitud que otra persona ya decidió, o
 * una del propio aprobador colada en la selección, sale en `skipped` con su
 * motivo y las demás siguen — en un lote de 12 no tiene sentido tirar once
 * por una.
 */
export const decidePromotionApprovalsAction = promotionsActionClient
  .inputSchema(decideApprovalsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "aprobar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aprobar promociones.",
      }
    }

    const approved = parsedInput.decision === "approved"
    const { data, error } = await ctx.supabase.rpc(
      "decide_promotion_approvals",
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

    await Promise.all(
      data.decided.map((row) =>
        logPromotionEvent(ctx, {
          promocionId: row.promocion_id as string,
          tipo: approved ? "aprobacion_concedida" : "aprobacion_rechazada",
          titulo: approved ? "Aprobación concedida" : "Aprobación rechazada",
          detalle: decisionDetail(parsedInput.reasonCode, parsedInput.note),
        })
      )
    )

    revalidatePath("/promociones")
    revalidatePath("/aprobaciones")
    return {
      ok: true as const,
      decided: data.decided.length,
      skipped: data.skipped,
    }
  })

/** El motivo en la bitácora: el código siempre, la nota solo si la hay. */
function decisionDetail(reasonCode: string, note?: string) {
  const label = DECISION_REASON_LABEL[reasonCode as DecisionReason]
  const trimmed = note?.trim()
  return trimmed ? `${label} — ${trimmed}` : label
}

/**
 * Retira una solicitud propia mientras siga pendiente — no pasa por
 * `decide_promotion_approval()` porque no es una decisión de un aprobador
 * distinto (no aplica la regla de cuatro ojos, aplica lo contrario: solo
 * quien la creó puede retirarla). Calco de
 * `features/coupons/actions/approvals.ts` `withdrawApprovalAction`.
 */
export const withdrawPromotionApprovalAction = promotionsActionClient
  .inputSchema(withdrawApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: approval, error: approvalError } = await ctx.supabase
      .from("promotion_approval")
      .select("id, promocion_id, requested_by, status")
      .eq("id", parsedInput.approvalId)
      .eq("org_id", ctx.orgId)
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
      .from("promotion_approval")
      .update({ status: "withdrawn", decided_at: new Date().toISOString() })
      .eq("id", approval.id)
    if (updateError) {
      return {
        ok: false as const,
        message: "No se pudo retirar la solicitud.",
      }
    }

    await ctx.supabase
      .from("promociones")
      .update({ estado_publicacion: "borrador" })
      .eq("id", approval.promocion_id)
      .eq("estado_publicacion", "pendiente_aprobacion")

    await logPromotionEvent(ctx, {
      promocionId: approval.promocion_id,
      tipo: "aprobacion_retirada",
      titulo: "Solicitud retirada",
    })

    revalidatePath("/promociones")
    revalidatePath("/aprobaciones")
    return { ok: true as const }
  })
