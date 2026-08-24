import type { CouponDisplayStatus, CouponStatus } from "@/types/domain"

/** Día calendario en UTC como entero comparable — mismo criterio que `features/promotions/lib/status.ts`, evita que la hora del día o la zona horaria muevan el límite. */
function dateOnly(value: string | Date): number {
  const d = typeof value === "string" ? new Date(value) : value
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * `expired` no se guarda en `coupon.status` (ver COUPON_DISPLAY_STATUSES en
 * src/types/domain.ts) — se deriva cruzando el estado almacenado con
 * `valid_to`, igual que `features/promotions/lib/status.ts` hace con las
 * promociones. Un cupón `redeemed`/`cancelled` no puede "expirar" después.
 */
export function couponStatus(
  coupon: { status: CouponStatus; valid_to: string | null },
  now: Date = new Date()
): CouponDisplayStatus {
  if (coupon.status === "redeemed" || coupon.status === "cancelled") {
    return coupon.status
  }
  if (coupon.valid_to && dateOnly(coupon.valid_to) < dateOnly(now)) {
    return "expired"
  }
  return coupon.status
}

/** "Vence hoy" / "Vence en N días" / "Sin vigencia" (detalle del cupón). */
export function validitySummary(
  coupon: { valid_to: string | null },
  now: Date = new Date()
): string {
  if (!coupon.valid_to) return "Sin vigencia"
  const days = Math.round(
    (dateOnly(coupon.valid_to) - dateOnly(now)) / 86_400_000
  )
  if (days < 0) return "Vencido"
  if (days === 0) return "Vence hoy"
  if (days === 1) return "Vence en 1 día"
  return `Vence en ${days} días`
}

/** Progreso de generación de una emisión (0-1). */
export function batchProgress(batch: {
  generated_count: number
  requested_quantity: number
}): number {
  if (batch.requested_quantity <= 0) return 0
  return Math.min(1, batch.generated_count / batch.requested_quantity)
}
