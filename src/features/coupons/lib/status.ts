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

/** Días de calendario hasta `valid_to` (negativo si ya venció, `null` sin fecha) — base compartida de `validitySummary` y del KPI "Vence en" de 13.4. */
export function daysUntilValid(
  coupon: { valid_to: string | null },
  now: Date = new Date()
): number | null {
  if (!coupon.valid_to) return null
  return Math.round((dateOnly(coupon.valid_to) - dateOnly(now)) / 86_400_000)
}

/** "Vence hoy" / "Vence en N días" / "Sin vigencia" (detalle del cupón). */
export function validitySummary(
  coupon: { valid_to: string | null },
  now: Date = new Date()
): string {
  const days = daysUntilValid(coupon, now)
  if (days == null) return "Sin vigencia"
  if (days < 0) return "Vencido"
  if (days === 0) return "Vence hoy"
  if (days === 1) return "Vence en 1 día"
  return `Vence en ${days} días`
}

/** Desde cuándo el cupón está en su estado actual (KPI "Estado" de 13.4) — `null` para `draft`/`expired` (derivado, sin columna propia). */
export function couponStatusSince(coupon: {
  status: CouponStatus
  assigned_at: string | null
  issued_at: string | null
  redeemed_at: string | null
  cancelled_at: string | null
}): string | null {
  switch (coupon.status) {
    case "assigned":
      return coupon.assigned_at
    case "issued":
      return coupon.issued_at
    case "redeemed":
      return coupon.redeemed_at
    case "cancelled":
      return coupon.cancelled_at
    default:
      return null
  }
}

/** Progreso de generación de una emisión (0-1). */
export function batchProgress(batch: {
  generated_count: number
  requested_quantity: number
}): number {
  if (batch.requested_quantity <= 0) return 0
  return Math.min(1, batch.generated_count / batch.requested_quantity)
}

/**
 * Columna "EMITIDOS / USADOS" del listado de emisiones (Figma 13.1): el
 * medidor cambia de sentido según el momento de vida del batch — mientras
 * genera, informa cuánto de lo solicitado ya existe (`batchProgress`);
 * una vez que dejó de generar, informa qué fracción de lo emitido ya se
 * canjeó (la métrica que de verdad importa después de emitir). `null`
 * cuando no hay emitidos todavía (nada que dividir).
 */
export function batchIssuedUsageRate(batch: {
  status: string
  generated_count: number
  requested_quantity: number
  redeemed_count: number
}): number | null {
  if (batch.status === "generating") return batchProgress(batch)
  if (batch.generated_count <= 0) return null
  return Math.min(1, batch.redeemed_count / batch.generated_count)
}
