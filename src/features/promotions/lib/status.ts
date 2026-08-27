import {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionStatus,
  isLocked,
  publicationStatus,
  type DisplayStatus,
  type ValidityStatus,
} from "@/lib/publication-status"
import type { PromotionPublicationStatus } from "@/types/domain"

/**
 * El ciclo de vida de una promoción, que desde el rediseño del builder es
 * el MISMO que el de una regla: se movió a `lib/publication-status.ts` para
 * que las dos features lo compartan sin importarse entre sí (CLAUDE.md §2).
 * Aquí solo queda la capa de nombres de esta feature —`estado_publicacion`
 * en vez de `estado`— para no tocar los llamadores.
 */

export type { ValidityStatus as PromotionValidityStatus }
export type PromotionStatus = DisplayStatus
export { ALLOWED_STATUS_TRANSITIONS, canTransitionStatus }

export function promotionStatus(
  promotion: {
    estado_publicacion: string
    vigente_desde: string
    vigente_hasta: string | null
  },
  now: Date = new Date()
): PromotionStatus {
  return publicationStatus(
    {
      estado: promotion.estado_publicacion,
      vigente_desde: promotion.vigente_desde,
      vigente_hasta: promotion.vigente_hasta,
    },
    now
  )
}

export function isPromotionLocked(promotion: {
  estado_publicacion: string
}): boolean {
  return isLocked({ estado: promotion.estado_publicacion })
}

/** Día calendario en UTC como entero comparable — evita que la hora del día o la zona horaria muevan el límite. */
function dateOnly(value: string | Date): number {
  const d = typeof value === "string" ? new Date(value) : value
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
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

/** Reexport del tipo de la columna, para que los llamadores no dependan del alias genérico. */
export type { PromotionPublicationStatus }
