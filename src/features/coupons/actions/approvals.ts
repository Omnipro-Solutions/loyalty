"use server"

import { revalidatePath } from "next/cache"

import { getRequestIp } from "@/lib/request-ip"

import { couponsActionClient } from "./action-client"
import { buildDirectCoupons, resolveRequestedQuantity } from "./batches"
import { APPROVAL_THRESHOLD_REASON_LABEL } from "../lib/labels"
import { hasPermission } from "../lib/permissions"
import { countOtherApprovers } from "../lib/queries"
import { evaluateApprovalRequirement } from "../lib/thresholds"
import {
  couponBatchSchema,
  decideApprovalSchema,
  withdrawApprovalSchema,
} from "../schemas"

/**
 * Crea el batch directo a `pending_approval` (regla 7.3) en vez de emitirlo.
 * Para orígenes directos/CSV, materializa los cupones YA en `'draft'`:
 * `memberId`/`importRows` solo existen en este request — si se difiriera su
 * creación a `approveApprovalAction` (que corre en otro request, quizá días
 * después, disparado por otro usuario) esa información ya no estaría
 * disponible en ningún lado. `batch_audience`/`batch_anonymous` no
 * necesitan este truco: `generate_coupon_batch_chunk` lee directo de
 * `coupon_batch`, así que su generación sí puede esperar a la aprobación.
 */
export const requestApprovalAction = couponsActionClient
  .inputSchema(couponBatchSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "emitir")) {
      return {
        ok: false as const,
        message: "No tienes permiso para emitir cupones.",
      }
    }

    const resolved = await resolveRequestedQuantity(ctx.supabase, parsedInput)
    if ("error" in resolved) {
      return { ok: false as const, message: resolved.error }
    }
    const { requestedQuantity, audienceSizeAtIssue } = resolved
    if (requestedQuantity <= 0) {
      return {
        ok: false as const,
        message: "No hay códigos para generar con estos datos.",
      }
    }

    // Umbrales SIEMPRE recalculados en servidor — nunca se confía en el
    // "requiere aprobación" que calculó el cliente.
    const approval = evaluateApprovalRequirement({
      requestedQuantity,
      discountType: parsedInput.discountType,
      discountValue: parsedInput.discountValue,
      pointsCost: parsedInput.pointsCost ?? null,
    })
    if (!approval.required) {
      return {
        ok: false as const,
        message:
          "Esta emisión no supera los umbrales de doble aprobación — emítela directamente.",
      }
    }

    const otherApprovers = await countOtherApprovers(ctx.orgId, ctx.userId)
    if (otherApprovers === 0) {
      return {
        ok: false as const,
        message:
          "No hay nadie más en la organización con permiso para aprobar cupones.",
      }
    }

    const ip = await getRequestIp()
    const now = new Date().toISOString()
    const authorLabel = ctx.actorLabel

    const { data: batch, error: insertError } = await ctx.supabase
      .from("coupon_batch")
      .insert({
        org_id: ctx.orgId,
        name: parsedInput.name,
        origin: parsedInput.origin,
        discount_type: parsedInput.discountType,
        discount_value: parsedInput.discountValue,
        discount_cap: parsedInput.discountCap ?? null,
        free_product_id: parsedInput.freeProductId ?? null,
        min_purchase_amount: parsedInput.minPurchaseAmount ?? null,
        max_uses_per_coupon: parsedInput.maxUsesPerCoupon,
        max_coupons_per_person: parsedInput.maxCouponsPerPerson,
        code_prefix: parsedInput.codePrefix ?? null,
        code_pattern: parsedInput.codePattern,
        valid_from: parsedInput.validFrom,
        valid_to: parsedInput.validTo || null,
        promotion_id: parsedInput.promotionId ?? null,
        audience_segment_id: parsedInput.audienceSegmentId ?? null,
        audience_mode: parsedInput.audienceMode ?? null,
        audience_resolved_at:
          parsedInput.origin === "batch_audience" ? now : null,
        audience_size_at_issue: audienceSizeAtIssue,
        points_cost: parsedInput.pointsCost ?? null,
        points_charge_timing: parsedInput.pointsChargeTiming ?? null,
        points_rate: parsedInput.pointsRate ?? null,
        requested_quantity: requestedQuantity,
        delivery_channels: parsedInput.deliveryChannels,
        store_ids: parsedInput.storeIds,
        category_ids: parsedInput.categoryIds,
        issue_reason: parsedInput.issueReason,
        internal_reference: parsedInput.internalReference ?? null,
        created_by: ctx.userId,
        authorized_by: ctx.userId,
        authorized_at: now,
        authorization_ip: ip,
        requires_approval: true,
      })
      .select("id")
      .single()

    if (insertError || !batch) {
      const message =
        insertError?.code === "23505"
          ? "Ya existe una emisión con esa referencia."
          : "No se pudo crear la emisión."
      return { ok: false as const, message }
    }

    await ctx.supabase.from("coupon_event").insert({
      org_id: ctx.orgId,
      batch_id: batch.id,
      type: "batch_created",
      title: "Emisión creada",
      actor_type: "user",
      actor_id: ctx.userId,
      actor_label: authorLabel,
    })

    // draft -> pending_approval (dispara guard_coupon_batch_transition).
    const { error: transitionError } = await ctx.supabase
      .from("coupon_batch")
      .update({ status: "pending_approval" })
      .eq("id", batch.id)
    if (transitionError) {
      return {
        ok: false as const,
        message: "No se pudo enviar la emisión a aprobación.",
      }
    }

    await ctx.supabase.from("coupon_event").insert({
      org_id: ctx.orgId,
      batch_id: batch.id,
      type: "authorization_signed",
      title: "Autorización firmada",
      actor_type: "user",
      actor_id: ctx.userId,
      actor_label: authorLabel,
    })

    if (
      parsedInput.origin !== "batch_audience" &&
      parsedInput.origin !== "batch_anonymous"
    ) {
      const built = await buildDirectCoupons(
        ctx.supabase,
        ctx.orgId,
        parsedInput
      )
      if ("error" in built) {
        return { ok: false as const, message: built.error }
      }

      const { error: couponsError } = await ctx.supabase.from("coupon").insert(
        built.coupons.map((c) => ({
          org_id: ctx.orgId,
          batch_id: batch.id,
          code: c.code,
          sequence: c.sequence,
          // 'draft', no el status que buildDirectCoupons calculó
          // (issued/assigned): estos códigos no existen de verdad hasta
          // que se aprueben — approveApprovalAction los "destapa".
          status: "draft" as const,
          member_id: c.member_id,
          bearer: c.bearer,
          discount_type: parsedInput.discountType,
          discount_value: parsedInput.discountValue,
          discount_cap: parsedInput.discountCap ?? null,
          min_purchase_amount: parsedInput.minPurchaseAmount ?? null,
          max_uses: parsedInput.maxUsesPerCoupon,
          points_cost: parsedInput.pointsCost ?? null,
          valid_from: parsedInput.validFrom,
          valid_to: parsedInput.validTo || null,
          qr_value: c.code,
        }))
      )
      if (couponsError) {
        const message =
          couponsError.code === "23505"
            ? "Alguno de los códigos generados ya existía — intenta de nuevo."
            : "No se pudieron crear los cupones."
        return { ok: false as const, message }
      }
    }

    const { data: approvalRow, error: approvalError } = await ctx.supabase
      .from("coupon_approval")
      .insert({
        org_id: ctx.orgId,
        batch_id: batch.id,
        requested_by: ctx.userId,
        threshold_reasons: approval.reasons,
      })
      .select("id")
      .single()
    if (approvalError || !approvalRow) {
      return {
        ok: false as const,
        message: "No se pudo crear la solicitud de aprobación.",
      }
    }

    await ctx.supabase.from("coupon_event").insert({
      org_id: ctx.orgId,
      batch_id: batch.id,
      type: "approval_requested",
      title: "Aprobación solicitada",
      detail: `Motivos: ${approval.reasons
        .map((r) => APPROVAL_THRESHOLD_REASON_LABEL[r])
        .join(", ")}`,
      actor_type: "user",
      actor_id: ctx.userId,
      actor_label: authorLabel,
      ip,
    })

    revalidatePath("/cupones")
    revalidatePath("/cupones/aprobaciones")
    return { ok: true as const, batchId: batch.id as string }
  })

/**
 * Aprueba una solicitud pendiente. `decide_coupon_approval` (SQL, SECURITY
 * DEFINER) hace la parte que no puede depender de este código: la regla de
 * cuatro ojos, el aislamiento por org y la transición del batch a
 * `'generating'` en una sola operación atómica. Esta acción solo se ocupa
 * de lo que viene DESPUÉS de que el batch ya está en `'generating'`:
 * generar los códigos (o destapar los que ya existían en `'draft'`).
 */
export const approveApprovalAction = couponsActionClient
  .inputSchema(decideApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "aprobar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aprobar cupones.",
      }
    }

    const { data: batchId, error: rpcError } = await ctx.supabase.rpc(
      "decide_coupon_approval",
      {
        p_approval_id: parsedInput.approvalId,
        p_decision: "approved",
        p_note: parsedInput.note || undefined,
      }
    )
    if (rpcError || !batchId) {
      return {
        ok: false as const,
        message: rpcError?.message ?? "No se pudo aprobar la solicitud.",
      }
    }

    const { data: batch, error: batchError } = await ctx.supabase
      .from("coupon_batch")
      .select("id, origin, points_charge_timing")
      .eq("id", batchId)
      .single()
    if (batchError || !batch) {
      return { ok: false as const, message: "La emisión ya no existe." }
    }

    const approverLabel = ctx.actorLabel

    await ctx.supabase.from("coupon_event").insert([
      {
        org_id: ctx.orgId,
        batch_id: batch.id,
        type: "approval_granted",
        title: "Aprobación concedida",
        detail: parsedInput.note || undefined,
        actor_type: "user",
        actor_id: ctx.userId,
        actor_label: approverLabel,
      },
      {
        org_id: ctx.orgId,
        batch_id: batch.id,
        type: "generation_started",
        title: "Generación iniciada",
        actor_type: "system",
        actor_label: "Sistema de cupones",
      },
    ])

    if (
      batch.origin === "batch_audience" ||
      batch.origin === "batch_anonymous"
    ) {
      // A diferencia de la emisión directa (acotada a ≤500 códigos por los
      // propios umbrales de aprobación), un batch aprobado puede ser
      // arbitrariamente grande — recorrer aquí los hasta 200 chunks de
      // `generateBatchChunks` arriesgaría el timeout de la función
      // serverless. Se deja en 'generating' con cero chunks corridos y
      // `/cupones/emisiones/[id]` retoma la generación en el cliente
      // (Fase 6), con barra de progreso y reanudable si la pestaña se
      // cierra a medias.
    } else {
      const now = new Date().toISOString()
      const { data: draftCoupons, error: draftError } = await ctx.supabase
        .from("coupon")
        .select("id, member_id, bearer")
        .eq("batch_id", batch.id)
        .eq("status", "draft")
      if (draftError) {
        return {
          ok: false as const,
          message: "No se pudieron activar los códigos de la emisión.",
        }
      }

      const bearerIds = (draftCoupons ?? [])
        .filter((c) => c.bearer)
        .map((c) => c.id)
      const memberCoupons = (draftCoupons ?? []).filter(
        (c) => !c.bearer && c.member_id
      )
      const chargePointsNow =
        batch.origin === "points_redemption" &&
        batch.points_charge_timing === "on_create"

      const source = batch.origin === "csv_import" ? "csv" : "manual"

      // Las tres escrituras de abajo son independientes (bearer/member son
      // conjuntos de ids disjuntos, y el insert de asignaciones solo lee
      // `memberCoupons`, ya resuelto arriba) — corren en paralelo.
      await Promise.all([
        bearerIds.length > 0
          ? ctx.supabase
              .from("coupon")
              .update({ status: "issued", issued_at: now })
              .in("id", bearerIds)
          : null,
        memberCoupons.length > 0
          ? ctx.supabase
              .from("coupon")
              .update({
                status: "assigned",
                issued_at: now,
                assigned_at: now,
                points_charged_at: chargePointsNow ? now : null,
              })
              .in(
                "id",
                memberCoupons.map((c) => c.id)
              )
          : null,
        memberCoupons.length > 0
          ? ctx.supabase.from("coupon_assignment").insert(
              memberCoupons.map((c) => ({
                org_id: ctx.orgId,
                coupon_id: c.id,
                member_id: c.member_id as string,
                role: "holder" as const,
                source,
              }))
            )
          : null,
      ])

      await Promise.all([
        ctx.supabase
          .from("coupon_batch")
          .update({ status: "issued", generation_completed_at: now })
          .eq("id", batch.id)
          .eq("status", "generating"),
        ctx.supabase.from("coupon_event").insert({
          org_id: ctx.orgId,
          batch_id: batch.id,
          type: "generation_completed",
          title: "Generación completada",
          actor_type: "system",
          actor_label: "Sistema de cupones",
        }),
      ])
    }

    revalidatePath("/cupones")
    revalidatePath("/cupones/aprobaciones")
    revalidatePath(`/cupones/emisiones/${batch.id}`)
    return { ok: true as const, batchId: batch.id as string }
  })

/**
 * Rechaza una solicitud pendiente. `decide_coupon_approval` deja el batch
 * de vuelta en `'draft'` (regla ya prevista en `guard_coupon_batch_transition()`
 * desde el esquema original) — esta acción solo limpia los cupones
 * `'draft'` pre-materializados de orígenes directos/CSV, que nunca llegaron
 * a existir de verdad.
 */
export const rejectApprovalAction = couponsActionClient
  .inputSchema(decideApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "aprobar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para aprobar cupones.",
      }
    }

    const { data: batchId, error: rpcError } = await ctx.supabase.rpc(
      "decide_coupon_approval",
      {
        p_approval_id: parsedInput.approvalId,
        p_decision: "rejected",
        p_note: parsedInput.note || undefined,
      }
    )
    if (rpcError || !batchId) {
      return {
        ok: false as const,
        message: rpcError?.message ?? "No se pudo rechazar la solicitud.",
      }
    }

    await ctx.supabase
      .from("coupon")
      .delete()
      .eq("batch_id", batchId)
      .eq("status", "draft")

    await ctx.supabase.from("coupon_event").insert({
      org_id: ctx.orgId,
      batch_id: batchId,
      type: "approval_rejected",
      title: "Aprobación rechazada",
      detail: parsedInput.note || undefined,
      actor_type: "user",
      actor_id: ctx.userId,
      actor_label: ctx.actorLabel,
    })

    revalidatePath("/cupones")
    revalidatePath("/cupones/aprobaciones")
    return { ok: true as const }
  })

/**
 * Retira una solicitud propia mientras siga pendiente — no pasa por
 * `decide_coupon_approval()` porque no es una decisión de un aprobador
 * distinto (no aplica la regla de cuatro ojos, aplica lo contrario: solo
 * quien la creó puede retirarla). El UPDATE de `coupon_approval` lo permite
 * la policy `coupon_approval_withdraw` de la migración, acotada a esta
 * transición exacta.
 */
export const withdrawApprovalAction = couponsActionClient
  .inputSchema(withdrawApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data: approval, error: approvalError } = await ctx.supabase
      .from("coupon_approval")
      .select("id, batch_id, requested_by, status")
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
      .from("coupon_approval")
      .update({ status: "withdrawn", decided_at: new Date().toISOString() })
      .eq("id", approval.id)
    if (updateError) {
      return { ok: false as const, message: "No se pudo retirar la solicitud." }
    }

    await ctx.supabase
      .from("coupon_batch")
      .update({ status: "draft" })
      .eq("id", approval.batch_id)
      .eq("status", "pending_approval")

    await ctx.supabase
      .from("coupon")
      .delete()
      .eq("batch_id", approval.batch_id)
      .eq("status", "draft")

    await ctx.supabase.from("coupon_event").insert({
      org_id: ctx.orgId,
      batch_id: approval.batch_id,
      type: "approval_withdrawn",
      title: "Solicitud retirada",
      actor_type: "user",
      actor_id: ctx.userId,
      actor_label: ctx.actorLabel,
    })

    revalidatePath("/cupones")
    revalidatePath("/cupones/aprobaciones")
    return { ok: true as const }
  })
