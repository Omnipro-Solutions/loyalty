"use server"

import { revalidatePath } from "next/cache"

import { promotionsActionClient } from "./action-client"
import { logPromotionEvent } from "./log-event"
import { hasPermission } from "../lib/permissions"
import { decideApprovalSchema, withdrawApprovalSchema } from "../schemas"

/**
 * Aprueba una solicitud pendiente. `decide_promotion_approval` (SQL,
 * SECURITY DEFINER) hace la parte que no puede depender de este código: la
 * regla de cuatro ojos, el aislamiento por org y la transición de la
 * promoción a `activa` en una sola operación atómica — calco de
 * `features/coupons/actions/approvals.ts` `approveApprovalAction`.
 */
export const approvePromotionApprovalAction = promotionsActionClient
  .inputSchema(decideApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "aprobar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aprobar promociones.",
      }
    }

    const { data: promocionId, error } = await ctx.supabase.rpc(
      "decide_promotion_approval",
      {
        p_approval_id: parsedInput.approvalId,
        p_decision: "approved",
        p_note: parsedInput.note || undefined,
      }
    )
    if (error || !promocionId) {
      return {
        ok: false as const,
        message: error?.message ?? "No se pudo aprobar la solicitud.",
      }
    }

    await logPromotionEvent(ctx, {
      promocionId,
      tipo: "aprobacion_concedida",
      titulo: "Aprobación concedida",
      detalle: parsedInput.note || undefined,
    })

    revalidatePath("/promociones")
    revalidatePath("/aprobaciones")
    revalidatePath(`/promociones/${promocionId}/editar`)
    return { ok: true as const, promocionId: promocionId as string }
  })

/**
 * Rechaza una solicitud pendiente. `decide_promotion_approval` deja la
 * promoción de vuelta en `borrador` — vuelve a ser editable.
 */
export const rejectPromotionApprovalAction = promotionsActionClient
  .inputSchema(decideApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "aprobar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aprobar promociones.",
      }
    }

    const { data: promocionId, error } = await ctx.supabase.rpc(
      "decide_promotion_approval",
      {
        p_approval_id: parsedInput.approvalId,
        p_decision: "rejected",
        p_note: parsedInput.note || undefined,
      }
    )
    if (error || !promocionId) {
      return {
        ok: false as const,
        message: error?.message ?? "No se pudo rechazar la solicitud.",
      }
    }

    await logPromotionEvent(ctx, {
      promocionId,
      tipo: "aprobacion_rechazada",
      titulo: "Aprobación rechazada",
      detalle: parsedInput.note || undefined,
    })

    revalidatePath("/promociones")
    revalidatePath("/aprobaciones")
    revalidatePath(`/promociones/${promocionId}/editar`)
    return { ok: true as const, promocionId: promocionId as string }
  })

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
