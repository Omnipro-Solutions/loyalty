"use server"

import { revalidatePath } from "next/cache"

import { getRequestIp } from "@/lib/request-ip"
import type { Database } from "@/types/database.types"
import type { CouponOrigin } from "@/types/domain"
import type { SupabaseClient } from "@supabase/supabase-js"

import { couponsActionClient } from "./action-client"
import { renderCodePattern } from "../lib/code"
import { hasPermission } from "../lib/permissions"
import { listUnviewedCouponIds } from "../lib/queries"
import { evaluateApprovalRequirement } from "../lib/thresholds"
import {
  couponBatchSchema,
  generateChunkSchema,
  resendUnviewedSchema,
  type CouponBatchValues,
} from "../schemas"

const APPROVAL_MESSAGE =
  "Esta emisión supera los umbrales de doble aprobación (más de 500 códigos, más de $50 USD de valor unitario, o 2.500 puntos o más) — usa «Solicitar aprobación» en vez de emitir directamente."

export type DirectCoupon = {
  code: string
  sequence: number
  member_id: string | null
  bearer: boolean
  status: "issued" | "assigned"
}

/**
 * Único punto que resuelve "cuántos códigos va a tener este batch" — lo
 * usan tanto `emitCouponBatchAction` (emisión directa) como
 * `requestApprovalAction` (../actions/approvals.ts): los umbrales de doble
 * aprobación (`evaluateApprovalRequirement`) deben evaluarse sobre el mismo
 * número sin importar qué acción termine creando el batch.
 */
export async function resolveRequestedQuantity(
  supabase: SupabaseClient<Database>,
  parsedInput: CouponBatchValues
): Promise<
  | { requestedQuantity: number; audienceSizeAtIssue: number | null }
  | { error: string }
> {
  if (parsedInput.origin === "batch_audience") {
    if (!parsedInput.audienceSegmentId) {
      return { error: "Elige una audiencia." }
    }
    const { data: segment } = await supabase
      .from("segments")
      .select("conteo_estimado")
      .eq("id", parsedInput.audienceSegmentId)
      .maybeSingle()
    if (!segment) {
      return { error: "La audiencia elegida ya no existe." }
    }
    return {
      requestedQuantity: segment.conteo_estimado ?? 0,
      audienceSizeAtIssue: segment.conteo_estimado,
    }
  }
  if (parsedInput.origin === "batch_anonymous") {
    return {
      requestedQuantity: parsedInput.requestedQuantity ?? 0,
      audienceSizeAtIssue: null,
    }
  }
  if (parsedInput.origin === "csv_import") {
    return {
      requestedQuantity: parsedInput.importRows?.length ?? 0,
      audienceSizeAtIssue: null,
    }
  }
  return { requestedQuantity: 1, audienceSizeAtIssue: null }
}

/**
 * Genera los códigos de un batch `batch_audience`/`batch_anonymous` por
 * chunks (RPC `generate_coupon_batch_chunk`) y, para `batch_audience`,
 * completa `coupon_assignment` a partir de lo que el RPC ya asignó en
 * `coupon.member_id`. Solo la usa `emitCouponBatchAction` (emisión
 * directa, acotada a ≤500 códigos por los propios umbrales de aprobación) —
 * `approveApprovalAction` (../actions/approvals.ts) deliberadamente NO la
 * llama tras aprobar: un batch aprobado puede ser arbitrariamente grande, y
 * recorrer aquí los hasta 200 chunks arriesgaría el timeout de la función
 * serverless (ver el comentario en approvals.ts).
 */
export async function generateBatchChunks(
  supabase: SupabaseClient<Database>,
  orgId: string,
  batchId: string,
  origin: CouponOrigin
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (let i = 0; i < 200; i += 1) {
    const { data: chunk, error: chunkError } = await supabase.rpc(
      "generate_coupon_batch_chunk",
      { p_batch_id: batchId, p_chunk_size: 500 }
    )
    if (chunkError) {
      return {
        ok: false,
        message: "No se pudieron generar los códigos de la emisión.",
      }
    }
    if (!chunk || chunk.length === 0 || chunk[0]?.done) break
  }

  const { data: generatedCoupons } = await supabase
    .from("coupon")
    .select("id, member_id")
    .eq("batch_id", batchId)
  await insertIssuedCouponEvents(
    supabase,
    orgId,
    batchId,
    generatedCoupons ?? []
  )

  // El RPC solo materializa `coupon.member_id` — completa aquí
  // `coupon_assignment` para que "Personas asociadas" tenga historial.
  if (origin === "batch_audience") {
    await insertHolderAssignments(supabase, orgId, generatedCoupons ?? [])
  }

  return { ok: true }
}

/**
 * Orígenes de volumen bajo (1 a unas pocas decenas): se materializan en un
 * solo paso, sin el chunking asíncrono que sí necesitan
 * `batch_audience`/`batch_anonymous` (ver Fase 7 del plan — no hay
 * worker/cola en este proyecto). Exportada: `requestApprovalAction`
 * (../actions/approvals.ts) la reusa para pre-materializar estos códigos en
 * `'draft'` mientras la solicitud está pendiente (ver comentario ahí).
 */
export async function buildDirectCoupons(
  supabase: SupabaseClient<Database>,
  orgId: string,
  values: CouponBatchValues
): Promise<{ coupons: DirectCoupon[] } | { error: string }> {
  if (
    values.origin === "manual_customer" ||
    values.origin === "points_redemption"
  ) {
    if (!values.memberId) return { error: "Elige el cliente titular." }
    return {
      coupons: [
        {
          code: renderCodePattern(values.codePattern, 1, values.codePrefix),
          sequence: 1,
          member_id: values.memberId,
          bearer: false,
          status: "assigned",
        },
      ],
    }
  }

  if (values.origin === "manual_bearer") {
    return {
      coupons: [
        {
          code: renderCodePattern(values.codePattern, 1, values.codePrefix),
          sequence: 1,
          member_id: null,
          bearer: true,
          status: "issued",
        },
      ],
    }
  }

  // csv_import
  const rows = values.importRows ?? []
  if (rows.length === 0)
    return { error: "Sube un archivo con al menos una fila." }

  const emails = rows.map((r) => r.email).filter((e): e is string => Boolean(e))
  const memberByEmail = new Map<string, string>()
  if (emails.length > 0) {
    const { data: members } = await supabase
      .from("members")
      .select("id, email")
      .eq("org_id", orgId)
      .in("email", emails)
    for (const m of members ?? []) memberByEmail.set(m.email, m.id)
  }

  return {
    coupons: rows.map((row, index) => {
      const memberId = row.email ? (memberByEmail.get(row.email) ?? null) : null
      return {
        code: renderCodePattern(
          values.codePattern,
          index + 1,
          values.codePrefix
        ),
        sequence: index + 1,
        member_id: memberId,
        bearer: memberId === null,
        status: memberId ? "assigned" : "issued",
      }
    }),
  }
}

/**
 * Registra en `coupon_event` el "issued" (y, si ya trae titular, el
 * "assigned") de cada cupón recién materializado — sin esto, un cupón
 * emitido llega a su pestaña "Eventos" con la línea de tiempo vacía. La
 * usan tanto la emisión directa (`emitCouponBatchAction`,
 * `generateBatchChunks`, `generateNextChunkAction`) como la activación de
 * una emisión ya aprobada (`approveApprovalAction` en ./approvals.ts).
 */
export async function insertIssuedCouponEvents(
  supabase: SupabaseClient<Database>,
  orgId: string,
  batchId: string,
  coupons: { id: string; member_id: string | null }[]
) {
  if (coupons.length === 0) return

  const memberIds = [
    ...new Set(
      coupons.map((c) => c.member_id).filter((id): id is string => id != null)
    ),
  ]
  const memberNameById = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from("members")
      .select("id, nombre")
      .in("id", memberIds)
    for (const m of members ?? []) memberNameById.set(m.id, m.nombre)
  }

  const events = coupons.flatMap((c) => {
    const rows: {
      org_id: string
      coupon_id: string
      batch_id: string
      type: "issued" | "assigned"
      title: string
      actor_type: "system"
      actor_label: string
    }[] = [
      {
        org_id: orgId,
        coupon_id: c.id,
        batch_id: batchId,
        type: "issued",
        title: "Cupón emitido",
        actor_type: "system",
        actor_label: "Sistema de cupones",
      },
    ]
    if (c.member_id) {
      const memberName = memberNameById.get(c.member_id)
      rows.push({
        org_id: orgId,
        coupon_id: c.id,
        batch_id: batchId,
        type: "assigned",
        title: memberName ? `Asignado a ${memberName}` : "Cupón asignado",
        actor_type: "system",
        actor_label: "Sistema de cupones",
      })
    }
    return rows
  })

  await supabase.from("coupon_event").insert(events)
}

/**
 * Completa `coupon_assignment` (rol "holder", origen "manual") para los
 * cupones ya asignados a un socio — la usan `generateBatchChunks` y
 * `generateNextChunkAction` tras un chunk `batch_audience`, donde el RPC
 * solo materializa `coupon.member_id`.
 */
async function insertHolderAssignments(
  supabase: SupabaseClient<Database>,
  orgId: string,
  coupons: { id: string; member_id: string | null }[]
) {
  const assigned = coupons.filter(
    (c): c is { id: string; member_id: string } => c.member_id != null
  )
  if (assigned.length === 0) return
  await supabase.from("coupon_assignment").insert(
    assigned.map((c) => ({
      org_id: orgId,
      coupon_id: c.id,
      member_id: c.member_id,
      role: "holder" as const,
      source: "manual" as const,
    }))
  )
}

export const emitCouponBatchAction = couponsActionClient
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

    // Umbrales SIEMPRE recalculados en servidor sobre los valores actuales
    // — nunca se confía en un "requiere aprobación" que haya calculado el
    // cliente (ver features/coupons/lib/thresholds.ts).
    const approval = evaluateApprovalRequirement({
      requestedQuantity,
      discountType: parsedInput.discountType,
      discountValue: parsedInput.discountValue,
      pointsCost: parsedInput.pointsCost ?? null,
    })
    if (approval.required) {
      return { ok: false as const, message: APPROVAL_MESSAGE }
    }

    const ip = await getRequestIp()
    const now = new Date().toISOString()
    const authorLabel = ctx.actorLabel

    // 1. Crear en 'draft' ya con la firma de autorización puesta — la
    // transición a 'generating' (guard_coupon_batch_transition) la exige.
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
        requires_approval: false,
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

    // 2. draft -> generating (dispara guard_coupon_batch_transition).
    const { error: transitionError } = await ctx.supabase
      .from("coupon_batch")
      .update({ status: "generating", generation_started_at: now })
      .eq("id", batch.id)
    if (transitionError) {
      return {
        ok: false as const,
        message: "No se pudo iniciar la generación de códigos.",
      }
    }

    await ctx.supabase.from("coupon_event").insert([
      {
        org_id: ctx.orgId,
        batch_id: batch.id,
        type: "authorization_signed",
        title: "Autorización firmada",
        actor_type: "user",
        actor_id: ctx.userId,
        actor_label: authorLabel,
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

    // 3. Materializar los códigos.
    if (
      parsedInput.origin === "batch_audience" ||
      parsedInput.origin === "batch_anonymous"
    ) {
      const chunkResult = await generateBatchChunks(
        ctx.supabase,
        ctx.orgId,
        batch.id,
        parsedInput.origin
      )
      if (!chunkResult.ok) {
        return { ok: false as const, message: chunkResult.message }
      }
    } else {
      const built = await buildDirectCoupons(
        ctx.supabase,
        ctx.orgId,
        parsedInput
      )
      if ("error" in built) {
        return { ok: false as const, message: built.error }
      }

      const { data: insertedCoupons, error: couponsError } = await ctx.supabase
        .from("coupon")
        .insert(
          built.coupons.map((c) => ({
            org_id: ctx.orgId,
            batch_id: batch.id,
            code: c.code,
            sequence: c.sequence,
            status: c.status,
            member_id: c.member_id,
            bearer: c.bearer,
            discount_type: parsedInput.discountType,
            discount_value: parsedInput.discountValue,
            discount_cap: parsedInput.discountCap ?? null,
            min_purchase_amount: parsedInput.minPurchaseAmount ?? null,
            max_uses: parsedInput.maxUsesPerCoupon,
            points_cost: parsedInput.pointsCost ?? null,
            points_charged_at:
              parsedInput.origin === "points_redemption" &&
              parsedInput.pointsChargeTiming === "on_create"
                ? now
                : null,
            valid_from: parsedInput.validFrom,
            valid_to: parsedInput.validTo || null,
            issued_at: now,
            assigned_at: c.member_id ? now : null,
            qr_value: c.code,
          }))
        )
        .select("id, member_id")

      if (couponsError) {
        const message =
          couponsError.code === "23505"
            ? "Alguno de los códigos generados ya existía — intenta de nuevo."
            : "No se pudieron crear los cupones."
        return { ok: false as const, message }
      }

      const source = parsedInput.origin === "csv_import" ? "csv" : "manual"
      const withMember = (insertedCoupons ?? []).filter((c) => c.member_id)
      if (withMember.length > 0) {
        await ctx.supabase.from("coupon_assignment").insert(
          withMember.map((c) => ({
            org_id: ctx.orgId,
            coupon_id: c.id,
            member_id: c.member_id as string,
            role: "holder" as const,
            source,
          }))
        )
      }

      await insertIssuedCouponEvents(
        ctx.supabase,
        ctx.orgId,
        batch.id,
        insertedCoupons ?? []
      )

      await ctx.supabase
        .from("coupon_batch")
        .update({
          status: "issued",
          generation_completed_at: new Date().toISOString(),
        })
        .eq("id", batch.id)
        .eq("status", "generating")

      await ctx.supabase.from("coupon_event").insert({
        org_id: ctx.orgId,
        batch_id: batch.id,
        type: "generation_completed",
        title: "Generación completada",
        actor_type: "system",
        actor_label: "Sistema de cupones",
      })
    }

    revalidatePath("/cupones")
    return { ok: true as const, batchId: batch.id as string }
  })

/**
 * Genera UN chunk (hasta 500 códigos) y devuelve el progreso — a diferencia
 * de `generateBatchChunks` (que recorre todos los chunks dentro de una sola
 * request), esta acción existe para que el CLIENTE la llame repetidamente
 * y pinte una barra de progreso real (Fase 6). Es también el mecanismo de
 * "reanudar": si la pestaña se cierra a medias, volver a
 * `/cupones/emisiones/[id]` con el batch todavía en `'generating'` simplemente
 * retoma las llamadas donde se quedaron — el RPC ya es idempotente por
 * `sequence`.
 */
export const generateNextChunkAction = couponsActionClient
  .inputSchema(generateChunkSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "emitir")) {
      return {
        ok: false as const,
        message: "No tienes permiso para generar códigos.",
      }
    }

    const { data: batch, error: batchError } = await ctx.supabase
      .from("coupon_batch")
      .select("id, status, origin")
      .eq("id", parsedInput.batchId)
      .maybeSingle()
    if (batchError || !batch) {
      return { ok: false as const, message: "La emisión ya no existe." }
    }
    if (batch.status !== "generating") {
      return {
        ok: false as const,
        message: "Esta emisión no está en generación.",
      }
    }

    const { data: chunk, error: chunkError } = await ctx.supabase.rpc(
      "generate_coupon_batch_chunk",
      { p_batch_id: batch.id, p_chunk_size: 500 }
    )
    if (chunkError) {
      return {
        ok: false as const,
        message: "No se pudo generar el siguiente lote de códigos.",
      }
    }
    const result = chunk?.[0]

    if (result?.done) {
      const { data: generatedCoupons } = await ctx.supabase
        .from("coupon")
        .select("id, member_id")
        .eq("batch_id", batch.id)
      await insertIssuedCouponEvents(
        ctx.supabase,
        ctx.orgId,
        batch.id,
        generatedCoupons ?? []
      )

      if (batch.origin === "batch_audience") {
        await insertHolderAssignments(
          ctx.supabase,
          ctx.orgId,
          generatedCoupons ?? []
        )
      }
    }

    revalidatePath(`/cupones/emisiones/${batch.id}`)
    if (result?.done) revalidatePath("/cupones")

    return {
      ok: true as const,
      generated: result?.generated ?? 0,
      total: result?.total ?? 0,
      done: result?.done ?? true,
    }
  })

/**
 * Versión en lote de `resendCouponAction` (../actions/coupons.ts): registra
 * un evento `delivered` para cada cupón de la emisión que todavía no tiene
 * un `viewed` — mismo límite que esa acción (sin sender real, ver
 * docs/cupones.md §4.3).
 */
export const resendUnviewedAction = couponsActionClient
  .inputSchema(resendUnviewedSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "cupones", "emitir")) {
      return {
        ok: false as const,
        message: "No tienes permiso para reenviar cupones.",
      }
    }

    const couponIds = await listUnviewedCouponIds(parsedInput.batchId)
    if (couponIds.length === 0) {
      return {
        ok: false as const,
        message: "Todos los cupones de esta emisión ya fueron vistos.",
      }
    }

    const { error: eventError } = await ctx.supabase
      .from("coupon_event")
      .insert(
        couponIds.map((couponId) => ({
          org_id: ctx.orgId,
          coupon_id: couponId,
          batch_id: parsedInput.batchId,
          type: "delivered" as const,
          title: "Cupón reenviado",
          detail:
            "Reenvío masivo (no vistos) — sin proveedor de email/SMS conectado.",
          actor_type: "user" as const,
          actor_id: ctx.userId,
          actor_label: ctx.actorLabel,
        }))
      )
    if (eventError) {
      return {
        ok: false as const,
        message: "No se pudo registrar el reenvío.",
      }
    }

    revalidatePath(`/cupones/emisiones/${parsedInput.batchId}`)
    return { ok: true as const, count: couponIds.length }
  })
