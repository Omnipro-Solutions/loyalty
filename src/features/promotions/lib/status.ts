import type { PromotionPublicationStatus } from "@/types/domain"

export type PromotionValidityStatus = "activa" | "programada" | "finalizada"

/** Día calendario en UTC como entero comparable — evita que la hora del día o la zona horaria muevan el límite. */
function dateOnly(value: string | Date): number {
  const d = typeof value === "string" ? new Date(value) : value
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Se cruza `estado_publicacion` con las fechas en vez de guardarse aparte — evita que quede desincronizado. */
export function promotionStatus(
  promotion: {
    estado_publicacion: string
    vigente_desde: string
    vigente_hasta: string | null
  },
  now: Date = new Date()
): PromotionPublicationStatus | PromotionValidityStatus {
  if (promotion.estado_publicacion === "borrador") return "borrador"
  const today = dateOnly(now)
  const start = dateOnly(promotion.vigente_desde)
  const end = promotion.vigente_hasta ? dateOnly(promotion.vigente_hasta) : null
  if (start > today) return "programada"
  if (end !== null && end < today) return "finalizada"
  return "activa"
}

/** "Vence hoy" / "Vence en N días" / "Permanente" (06.1, tarjetas superiores). */
export function validitySummary(
  promotion: { vigente_hasta: string | null },
  now: Date = new Date()
): string {
  if (!promotion.vigente_hasta) return "Permanente"
  const days = Math.round(
    (dateOnly(promotion.vigente_hasta) - dateOnly(now)) / 86_400_000
  )
  if (days < 0) return "Vencida"
  if (days === 0) return "Vence hoy"
  if (days === 1) return "Vence en 1 día"
  return `Vence en ${days} días`
}
