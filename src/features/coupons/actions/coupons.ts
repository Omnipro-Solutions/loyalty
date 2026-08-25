"use server"

import { revalidatePath } from "next/cache"

import { getRequestIp } from "@/lib/request-ip"

import { couponsActionClient } from "./action-client"
import { hasPermission } from "../lib/permissions"
import {
  cancelCouponSchema,
  extendValiditySchema,
  resendCouponSchema,
} from "../schemas"

export const voidCouponAction = couponsActionClient
  .inputSchema(cancelCouponSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "anular")) {
      return {
        ok: false as const,
        message: "No tienes permiso para anular cupones.",
      }
    }

    const { data: coupon, error: couponError } = await ctx.supabase
      .from("coupon")
      .select(
        "id, status, member_id, points_cost, points_charged_at, points_refunded"
      )
      .eq("id", parsedInput.couponId)
      .eq("org_id", ctx.orgId)
      .maybeSingle()
    if (couponError || !coupon) {
      return { ok: false as const, message: "El cupón ya no existe." }
    }
    if (coupon.status === "cancelled") {
      return { ok: false as const, message: "Este cupón ya está anulado." }
    }

    const canRefund =
      parsedInput.refundPoints &&
      coupon.points_charged_at != null &&
      !coupon.points_refunded &&
      coupon.member_id != null &&
      (coupon.points_cost ?? 0) > 0

    const ip = await getRequestIp()
    const actorLabel = ctx.actorLabel
    const now = new Date().toISOString()

    const { error: updateError } = await ctx.supabase
      .from("coupon")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancel_reason_code: parsedInput.reasonCode,
        cancel_reason_note: parsedInput.reasonNote || null,
        cancelled_by: ctx.userId,
        points_refunded: canRefund ? true : coupon.points_refunded,
      })
      .eq("id", coupon.id)
    if (updateError) {
      return { ok: false as const, message: "No se pudo anular el cupón." }
    }

    if (canRefund) {
      await ctx.supabase.from("points_ledger").insert({
        org_id: ctx.orgId,
        member_id: coupon.member_id as string,
        tipo: "ajuste",
        puntos: coupon.points_cost as number,
        origen: `Devolución por anulación de cupón (${parsedInput.couponId})`,
      })
    }

    const { error: eventError } = await ctx.supabase
      .from("coupon_event")
      .insert({
        org_id: ctx.orgId,
        coupon_id: coupon.id,
        type: "cancelled",
        title: "Cupón anulado",
        detail: canRefund ? "Puntos devueltos al cliente" : undefined,
        actor_type: "user",
        actor_id: ctx.userId,
        actor_label: actorLabel,
        reason_code: parsedInput.reasonCode,
        reason_note: parsedInput.reasonNote || null,
        ip,
      })
    if (eventError) {
      return {
        ok: false as const,
        message: "El cupón se anuló, pero no se pudo registrar el evento.",
      }
    }

    revalidatePath(`/cupones/${coupon.id}`)
    return { ok: true as const }
  })

export const extendValidityAction = couponsActionClient
  .inputSchema(extendValiditySchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "emitir")) {
      return {
        ok: false as const,
        message: "No tienes permiso para extender la vigencia de un cupón.",
      }
    }

    const { data: coupon, error: couponError } = await ctx.supabase
      .from("coupon")
      .select("id, status, valid_to")
      .eq("id", parsedInput.couponId)
      .eq("org_id", ctx.orgId)
      .maybeSingle()
    if (couponError || !coupon) {
      return { ok: false as const, message: "El cupón ya no existe." }
    }
    if (coupon.status === "cancelled") {
      return {
        ok: false as const,
        message: "No se puede extender un cupón anulado.",
      }
    }
    if (coupon.valid_to && parsedInput.validTo <= coupon.valid_to) {
      return {
        ok: false as const,
        message: "La nueva fecha debe ser posterior a la vigencia actual.",
      }
    }

    const ip = await getRequestIp()

    const { error: updateError } = await ctx.supabase
      .from("coupon")
      .update({ valid_to: parsedInput.validTo })
      .eq("id", coupon.id)
    if (updateError) {
      return {
        ok: false as const,
        message: "No se pudo extender la vigencia.",
      }
    }

    const { error: eventError } = await ctx.supabase
      .from("coupon_event")
      .insert({
        org_id: ctx.orgId,
        coupon_id: coupon.id,
        type: "validity_extended",
        title: "Vigencia extendida",
        detail: `Nueva fecha de vencimiento: ${parsedInput.validTo}`,
        actor_type: "user",
        actor_id: ctx.userId,
        actor_label: ctx.actorLabel,
        ip,
      })
    if (eventError) {
      return {
        ok: false as const,
        message:
          "La vigencia se extendió, pero no se pudo registrar el evento.",
      }
    }

    revalidatePath(`/cupones/${coupon.id}`)
    return { ok: true as const }
  })

export const resendCouponAction = couponsActionClient
  .inputSchema(resendCouponSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "emitir")) {
      return {
        ok: false as const,
        message: "No tienes permiso para reenviar cupones.",
      }
    }

    const { data: coupon, error: couponError } = await ctx.supabase
      .from("coupon")
      .select("id, status")
      .eq("id", parsedInput.couponId)
      .eq("org_id", ctx.orgId)
      .maybeSingle()
    if (couponError || !coupon) {
      return { ok: false as const, message: "El cupón ya no existe." }
    }
    if (coupon.status === "cancelled") {
      return {
        ok: false as const,
        message: "No se puede reenviar un cupón anulado.",
      }
    }

    const { error: eventError } = await ctx.supabase
      .from("coupon_event")
      .insert({
        org_id: ctx.orgId,
        coupon_id: coupon.id,
        type: "delivered",
        title: "Cupón reenviado",
        detail:
          "Sin proveedor de email/SMS conectado — evento registrado manualmente.",
        actor_type: "user",
        actor_id: ctx.userId,
        actor_label: ctx.actorLabel,
      })
    if (eventError) {
      return {
        ok: false as const,
        message: "No se pudo registrar el reenvío.",
      }
    }

    revalidatePath(`/cupones/${coupon.id}`)
    return { ok: true as const }
  })
