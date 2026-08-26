import type { PromotionPublicationStatus } from "@/types/domain"

/** Único estado que no se guarda: se deriva de 'activa' + las fechas de vigencia. */
export type PromotionValidityStatus = "programada"

/** Lo que se muestra en el listado y en la tarjeta de estado. */
export type PromotionStatus =
  PromotionPublicationStatus | PromotionValidityStatus

/** Día calendario en UTC como entero comparable — evita que la hora del día o la zona horaria muevan el límite. */
function dateOnly(value: string | Date): number {
  const d = typeof value === "string" ? new Date(value) : value
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * `borrador`, `inactiva` y `finalizada` son decisiones explícitas del
 * operador y se muestran tal cual. Solo `activa` se cruza con las fechas
 * — así `programada`/`finalizada` por vigencia no pueden quedar
 * desincronizadas de la columna.
 */
export function promotionStatus(
  promotion: {
    estado_publicacion: string
    vigente_desde: string
    vigente_hasta: string | null
  },
  now: Date = new Date()
): PromotionStatus {
  if (promotion.estado_publicacion !== "activa") {
    return promotion.estado_publicacion as PromotionPublicationStatus
  }
  const today = dateOnly(now)
  const start = dateOnly(promotion.vigente_desde)
  const end = promotion.vigente_hasta ? dateOnly(promotion.vigente_hasta) : null
  if (start > today) return "programada"
  if (end !== null && end < today) return "finalizada"
  return "activa"
}

/**
 * Una promoción solo es editable mientras es un borrador. En cuanto se
 * publica (cualquier otro estado) sus campos pasan a ser de solo lectura y
 * lo único que se puede cambiar es el propio estado — de ahí que ningún
 * estado publicado pueda volver a `borrador` (ver
 * `ALLOWED_STATUS_TRANSITIONS`).
 */
export function isPromotionLocked(promotion: {
  estado_publicacion: string
}): boolean {
  return promotion.estado_publicacion !== "borrador"
}

/**
 * Transiciones permitidas al cambiar el estado de una promoción ya creada.
 * Regla única: entre estados publicados se puede ir a cualquiera, pero
 * ninguno vuelve a `borrador` — volver a borrador reabriría la edición de
 * una promoción que ya estuvo publicada.
 *
 * Al CREAR no aplica: ahí los cuatro estados son elegibles como estado
 * inicial (campo "Estado" del paso Resumen).
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  PromotionPublicationStatus,
  readonly PromotionPublicationStatus[]
> = {
  borrador: ["activa", "inactiva", "finalizada"],
  activa: ["inactiva", "finalizada"],
  inactiva: ["activa", "finalizada"],
  finalizada: ["activa", "inactiva"],
}

export function canTransitionStatus(
  from: PromotionPublicationStatus,
  to: PromotionPublicationStatus
): boolean {
  return from === to || ALLOWED_STATUS_TRANSITIONS[from].includes(to)
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
