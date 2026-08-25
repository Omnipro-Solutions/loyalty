"use server"

import { revalidatePath } from "next/cache"

import { couponsActionClient } from "./action-client"
import { hasPermission } from "../lib/permissions"
import { registerPrintJobSchema } from "../schemas"

/**
 * Registra la impresión — `coupon_print_job` + `printed_at`/`print_count`
 * por cupón + evento `printed` — en el momento en que el usuario confirma
 * "Imprimir", no al solo cargar la vista previa. Sin worker de PDF en este
 * proyecto: `file_url` se queda vacío a propósito, el "documento" es la
 * propia página que `window.print()` manda al navegador.
 */
export const registerPrintJobAction = couponsActionClient
  .inputSchema(registerPrintJobSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "imprimir")) {
      return {
        ok: false as const,
        message: "No tienes permiso para imprimir cupones.",
      }
    }

    const now = new Date().toISOString()

    const { data: coupons, error: couponsError } = await ctx.supabase
      .from("coupon")
      .select("id, print_count")
      .in("id", parsedInput.couponIds)
    if (couponsError) {
      return {
        ok: false as const,
        message: "No se pudo registrar la impresión.",
      }
    }

    const pageCount =
      parsedInput.layout === "grid_8"
        ? Math.ceil(parsedInput.couponIds.length / 8)
        : parsedInput.couponIds.length

    // Las tres escrituras son independientes entre sí (ninguna lee el
    // resultado de otra) — corren en paralelo en vez de una tras otra.
    await Promise.all([
      ...(coupons ?? []).map((c) =>
        ctx.supabase
          .from("coupon")
          .update({ printed_at: now, print_count: (c.print_count ?? 0) + 1 })
          .eq("id", c.id)
      ),
      ctx.supabase.from("coupon_print_job").insert({
        org_id: ctx.orgId,
        batch_id: parsedInput.batchId,
        coupon_ids: parsedInput.couponIds,
        layout: parsedInput.layout,
        page_count: pageCount,
        status: "ready",
        requested_by: ctx.userId,
      }),
      ctx.supabase.from("coupon_event").insert(
        parsedInput.couponIds.map((couponId) => ({
          org_id: ctx.orgId,
          coupon_id: couponId,
          batch_id: parsedInput.batchId,
          type: "printed" as const,
          title: "Cupón impreso",
          actor_type: "user" as const,
          actor_id: ctx.userId,
          actor_label: ctx.actorLabel,
        }))
      ),
    ])

    revalidatePath(`/cupones/emisiones/${parsedInput.batchId}`)
    return { ok: true as const }
  })
