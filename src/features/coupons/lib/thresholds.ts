import type { CouponDiscountType } from "@/types/domain"

/** Espeja el `check` de `coupon_approval.threshold_reasons` (ver la migración del flujo de aprobación). */
export const APPROVAL_THRESHOLD_REASONS = [
  "volume",
  "unit_value",
  "points_cost",
] as const
export type ApprovalThresholdReason =
  (typeof APPROVAL_THRESHOLD_REASONS)[number]

export type ApprovalThresholds = {
  /** Exclusivo: dispara con `requestedQuantity > maxQuantity`. docs/cupones.md §7.3: > 500. */
  maxQuantity: number
  /** Exclusivo, USD. Solo aplica a `discountType: "fixed_amount"`. docs/cupones.md §7.3: > 50 (originalmente EUR, aquí USD). */
  maxDiscountAmount: number
  /** Exclusivo, %. Solo aplica a `discountType: "percentage"` — un 60% no son 60 USD, así que no puede compararse contra `maxDiscountAmount`. */
  maxDiscountPercent: number
  /** Inclusivo: dispara con `pointsCost >= minPointsCost`. docs/cupones.md §7.3: >= 2500. */
  minPointsCost: number
}

export const DEFAULT_APPROVAL_THRESHOLDS: ApprovalThresholds = {
  maxQuantity: 500,
  maxDiscountAmount: 50,
  maxDiscountPercent: 50,
  minPointsCost: 2500,
}

export type ApprovalCandidate = {
  requestedQuantity: number
  discountType: CouponDiscountType
  discountValue: number
  pointsCost: number | null
}

export type ApprovalRequirement = {
  required: boolean
  reasons: ApprovalThresholdReason[]
}

/**
 * Única fuente de los umbrales de doble aprobación (docs/cupones.md §7.3).
 * Pura: sin red ni base de datos, para poder testearla con Vitest y para
 * que el asistente avise en el paso "Autorización" sin ir al servidor.
 *
 * Los NÚMEROS viven aquí, no en un `check` de Postgres: un `check` se
 * revalida en cada UPDATE de la fila, así que subir un umbral de 500 a
 * 1000 volvería inactualizables todas las filas históricas que ya no lo
 * cumplan. Postgres solo enforcea el INVARIANTE (que exista una fila
 * `coupon_approval` aprobada antes de generar códigos, ver
 * guard_coupon_batch_transition() en la migración), nunca estos números.
 *
 * `discount_value > 50` del doc es ambiguo para un descuento porcentual (un
 * 60% no son 60 USD) y no aplica a `free_product` — por eso hay dos
 * umbrales de valor unitario que producen el mismo reason code
 * (`unit_value`): el set de reasons se queda en tres, como el doc, pero la
 * comparación es correcta según el tipo de descuento.
 */
export function evaluateApprovalRequirement(
  candidate: ApprovalCandidate,
  thresholds: ApprovalThresholds = DEFAULT_APPROVAL_THRESHOLDS
): ApprovalRequirement {
  const reasons: ApprovalThresholdReason[] = []

  if (candidate.requestedQuantity > thresholds.maxQuantity) {
    reasons.push("volume")
  }

  if (
    candidate.discountType === "fixed_amount" &&
    candidate.discountValue > thresholds.maxDiscountAmount
  ) {
    reasons.push("unit_value")
  }
  if (
    candidate.discountType === "percentage" &&
    candidate.discountValue > thresholds.maxDiscountPercent
  ) {
    reasons.push("unit_value")
  }

  if (
    candidate.pointsCost !== null &&
    candidate.pointsCost >= thresholds.minPointsCost
  ) {
    reasons.push("points_cost")
  }

  return { required: reasons.length > 0, reasons }
}
