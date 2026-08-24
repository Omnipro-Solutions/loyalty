import { formatUSD } from "@/lib/format"

import type { CouponBatchValues } from "../schemas"
import { COUPON_DISCOUNT_TYPE_LABEL, COUPON_ORIGIN_LABEL } from "./labels"
import type { CouponStepId } from "./steps"

export type RecapLookups = {
  memberNameById: Map<string, string>
  audienceNameById: Map<string, string>
}

/**
 * Resumen de una línea por paso ya completado, para el rail lateral del
 * asistente ("Reactivación VIP · 1.240 personas"). Pura y testeable: toma
 * los valores del `useWatch({control})` del formulario, no React.
 */
export function stepRecap(
  stepId: CouponStepId,
  values: Partial<CouponBatchValues>,
  lookups: RecapLookups
): string | undefined {
  switch (stepId) {
    case "origin":
      return values.origin ? COUPON_ORIGIN_LABEL[values.origin] : undefined
    case "recipient":
      return values.memberId
        ? (lookups.memberNameById.get(values.memberId) ?? "1 cliente")
        : undefined
    case "audience":
      return values.audienceSegmentId
        ? (lookups.audienceNameById.get(values.audienceSegmentId) ??
            "Audiencia elegida")
        : undefined
    case "quantity":
      return values.requestedQuantity
        ? `${values.requestedQuantity} códigos`
        : undefined
    case "file":
      return values.importRows?.length
        ? `${values.importRows.length} filas`
        : undefined
    case "points":
      return values.pointsCost
        ? `${values.pointsCost} pts por cupón`
        : undefined
    case "coupon":
      if (!values.name || !values.discountType) return undefined
      return `${values.name} · ${COUPON_DISCOUNT_TYPE_LABEL[values.discountType]}`
    case "authorization":
      return values.issueReason ? "Firmado" : undefined
    case "review":
      return undefined
  }
}

/** Texto del descuento para la tarjeta de previsualización del vale ("15% de descuento", "$5.00 de descuento", "Producto gratis"). */
export function discountSummary(values: Partial<CouponBatchValues>): string {
  if (!values.discountType) return "—"
  if (values.discountType === "free_product") return "Producto gratis"
  if (values.discountType === "percentage") {
    return `${values.discountValue ?? 0}% de descuento`
  }
  return `${formatUSD(values.discountValue ?? 0)} de descuento`
}
