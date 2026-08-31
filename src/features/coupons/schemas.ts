import { z } from "zod"

import {
  COUPON_AUDIENCE_MODES,
  COUPON_BATCH_STATUSES,
  COUPON_DELIVERY_CHANNELS,
  COUPON_DISCOUNT_TYPES,
  COUPON_ORIGINS,
  COUPON_POINTS_CHARGE_TIMINGS,
  COUPON_PRINT_LAYOUTS,
  COUPON_SEARCH_SCOPES,
  COUPON_STATUSES,
} from "@/types/domain"

const importRowSchema = z.object({
  email: z.string().nullable(),
  memberCode: z.string().nullable(),
  code: z.string().nullable(),
})

/**
 * Objeto plano con campos laxos, NO `z.discriminatedUnion` por origen: una
 * unión discriminada rompería `keyof CouponBatchValues` (que
 * `lib/steps.ts`/el wizard necesitan para `trigger(step.fields)`), los
 * `defaultValues` y el tipo de `errors`. Lo que varía por origen se valida
 * en `refineByOrigin` (abajo), no en la forma del tipo.
 */
const couponBatchBaseSchema = z.object({
  origin: z.enum(COUPON_ORIGINS),

  // Paso "Destinatario" (manual_customer, points_redemption)
  memberId: z.string().uuid().optional(),

  // Paso "Audiencia" (batch_audience)
  audienceSegmentId: z.string().uuid().optional(),
  audienceMode: z.enum(COUPON_AUDIENCE_MODES).optional(),

  // Paso "Lote" (batch_anonymous)
  requestedQuantity: z.number().int().positive().max(50_000).optional(),

  // Paso "Archivo" (csv_import)
  importFilename: z.string().optional(),
  importRows: z.array(importRowSchema).optional(),

  // Paso "Puntos" (points_redemption)
  pointsCost: z.number().int().nonnegative().optional(),
  pointsChargeTiming: z.enum(COUPON_POINTS_CHARGE_TIMINGS).optional(),
  pointsRate: z.number().nonnegative().optional(),

  // Paso "Cupón" (todos los orígenes)
  name: z.string().min(3, "Ingresa el nombre de la emisión"),
  discountType: z.enum(COUPON_DISCOUNT_TYPES),
  discountValue: z.number().nonnegative(),
  discountCap: z.number().positive().optional(),
  freeProductId: z.string().uuid().optional(),
  minPurchaseAmount: z.number().nonnegative().optional(),
  // Sin `.default(...)`: el formulario siempre los provee vía
  // `useForm({defaultValues})` — un default de zod aquí volvería el tipo de
  // ENTRADA (el que maneja react-hook-form) distinto del de SALIDA
  // (el que valida el resolver), y `zodResolver` exige que coincidan.
  maxUsesPerCoupon: z.number().int().positive(),
  maxCouponsPerPerson: z.number().int().positive(),
  codePrefix: z.string().max(12).optional(),
  codePattern: z
    .string()
    .min(4)
    .max(32)
    .refine((v) => v.includes("N"), "El patrón necesita al menos un token N"),
  validFrom: z.string().min(1, "Elige la fecha de inicio"),
  validTo: z.string().optional(),
  storeIds: z.array(z.string().uuid()),
  categoryIds: z.array(z.string().uuid()),
  deliveryChannels: z.array(z.enum(COUPON_DELIVERY_CHANNELS)),
  promotionId: z.string().uuid().optional(),

  // Paso "Autorización" (todos los orígenes)
  issueReason: z.string().min(1, "El motivo de emisión es obligatorio"),
  internalReference: z.string().max(64).optional(),
})

/**
 * REGLA INVIOLABLE: toda incidencia añadida aquí DEBE llevar `path`
 * apuntando a un campo que pertenezca a algún paso de
 * `lib/steps.ts` `STEP_BY_ID`. Una incidencia sin `path` es de nivel
 * formulario, react-hook-form no la asocia a ningún campo y
 * `trigger(step.fields)` nunca la vería — el paso se dejaría pasar y el
 * error solo aparecería al guardar.
 */
function refineByOrigin(
  v: z.infer<typeof couponBatchBaseSchema>,
  ctx: z.RefinementCtx
) {
  const need = (cond: boolean, path: string, message: string) => {
    if (cond) ctx.addIssue({ code: "custom", path: [path], message })
  }

  need(
    v.origin === "manual_customer" && !v.memberId,
    "memberId",
    "Elige el cliente titular"
  )
  need(
    v.origin === "points_redemption" && !v.memberId,
    "memberId",
    "Elige el cliente que canjea"
  )
  need(
    v.origin === "points_redemption" && !v.pointsCost,
    "pointsCost",
    "Indica los puntos por cupón"
  )
  need(
    v.origin === "batch_audience" && !v.audienceSegmentId,
    "audienceSegmentId",
    "Elige una audiencia"
  )
  need(
    v.origin === "batch_anonymous" && !v.requestedQuantity,
    "requestedQuantity",
    "Indica cuántos códigos generar"
  )
  need(
    v.origin === "csv_import" && !v.importRows?.length,
    "importRows",
    "Sube un archivo con al menos una fila"
  )
  need(
    v.discountType === "free_product" && !v.freeProductId,
    "freeProductId",
    "Elige el producto de regalo"
  )
  need(
    v.discountType === "percentage" &&
      (v.discountValue < 1 || v.discountValue > 100),
    "discountValue",
    "El porcentaje va de 1 a 100"
  )
  need(
    v.discountType === "fixed_amount" && v.discountValue <= 0,
    "discountValue",
    "Ingresa un valor mayor a 0"
  )
}

export const couponBatchSchema =
  couponBatchBaseSchema.superRefine(refineByOrigin)
export type CouponBatchValues = z.infer<typeof couponBatchSchema>

export const updateCouponBatchSchema = couponBatchBaseSchema
  .extend({ id: z.string().uuid() })
  .superRefine(refineByOrigin)

export const cancelCouponBaseSchema = z.object({
  couponId: z.string().uuid(),
  reasonCode: z.enum([
    "issued_in_error",
    "duplicate",
    "suspected_fraud",
    "customer_request",
    "other",
  ]),
  reasonNote: z.string().optional(),
  refundPoints: z.boolean().default(false),
})

/** Espejo del check `coupon_cancel_note_required` — ver `COUPON_CANCEL_REASONS_REQUIRING_NOTE` en `types/domain.ts`. Exportado (no inline) para que el diálogo pueda reaplicarlo sobre la variante sin `couponId` que usa react-hook-form. */
export function refineCancelReasonNote(
  v: { reasonCode: string; reasonNote?: string },
  ctx: z.RefinementCtx
) {
  const requiresNote =
    v.reasonCode === "suspected_fraud" || v.reasonCode === "other"
  if (requiresNote && !v.reasonNote?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["reasonNote"],
      message: "La nota es obligatoria para este motivo",
    })
  }
}

export const cancelCouponSchema = cancelCouponBaseSchema.superRefine(
  refineCancelReasonNote
)

export const extendValiditySchema = z.object({
  couponId: z.string().uuid(),
  validTo: z.string().min(1, "Elige la nueva fecha de vencimiento"),
})

export const resendCouponSchema = z.object({
  couponId: z.string().uuid(),
})

export const decideApprovalSchema = z.object({
  approvalId: z.string().uuid(),
  note: z.string().optional(),
})

export const withdrawApprovalSchema = z.object({
  approvalId: z.string().uuid(),
})

export const assignCouponSchema = z.object({
  couponId: z.string().uuid(),
  memberId: z.string().uuid(),
})

export const generateChunkSchema = z.object({
  batchId: z.string().uuid(),
})

export const previewBatchCouponsExportSchema = z.object({
  batchId: z.string().uuid(),
})

/** `columns`: keys de `BATCH_COUPONS_EXPORT_COLUMNS` marcadas en `ExportDialog` — vacío exporta todas. */
export const exportBatchCouponsSchema = previewBatchCouponsExportSchema.extend({
  columns: z.array(z.string()).optional(),
})

export const resendUnviewedSchema = z.object({
  batchId: z.string().uuid(),
})

export const registerPrintJobSchema = z.object({
  batchId: z.string().uuid(),
  couponIds: z.array(z.string().uuid()).min(1),
  layout: z.enum(COUPON_PRINT_LAYOUTS),
})

/** Filtros del listado (13.1) por vista — "batches" y "coupons" tienen
 *  espacios de `status` distintos (`CouponBatchStatus` vs `CouponStatus`) y
 *  solo "batches" filtra por `origin`, así que es una unión discriminada
 *  por `view`, no un objeto con todo opcional (el stub anterior no
 *  distinguía vistas ni validaba `searchScope`/`origin`/`status` contra un
 *  enum). Comparte `previewCouponsListExportSchema` (conteo) y
 *  `exportCouponsListSchema` (además valida `columns`). */
const couponBatchesExportFiltersSchema = z.object({
  view: z.literal("batches"),
  search: z.string().max(200).optional(),
  searchScope: z.enum(COUPON_SEARCH_SCOPES).optional(),
  status: z.enum(COUPON_BATCH_STATUSES).optional(),
  origin: z.enum(COUPON_ORIGINS).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
})

const couponsListExportFiltersSchema = z.object({
  view: z.literal("coupons"),
  search: z.string().max(200).optional(),
  searchScope: z.enum(COUPON_SEARCH_SCOPES).optional(),
  status: z.enum(COUPON_STATUSES).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
})

export const previewCouponsListExportSchema = z.discriminatedUnion("view", [
  couponBatchesExportFiltersSchema,
  couponsListExportFiltersSchema,
])
export type CouponsListExportFiltersInput = z.infer<
  typeof previewCouponsListExportSchema
>

export const exportCouponsListSchema = z.discriminatedUnion("view", [
  couponBatchesExportFiltersSchema.extend({
    columns: z.array(z.string()).optional(),
  }),
  couponsListExportFiltersSchema.extend({
    columns: z.array(z.string()).optional(),
  }),
])

export const registerRedemptionSchema = z.object({
  couponId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  orderAmount: z.number().nonnegative().optional(),
  discountApplied: z.number().nonnegative().optional(),
  channel: z.enum(["pos", "ecommerce", "app"]),
  result: z.enum(["applied", "rejected", "validated"]),
  rejectionCode: z.string().optional(),
})
