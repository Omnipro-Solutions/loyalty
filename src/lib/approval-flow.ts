import type { ApprovalStatus } from "@/types/domain"

/**
 * Reglas puras del flujo de doble aprobación de promociones y reglas del
 * builder, compartidas por las dos — mismo criterio que
 * `lib/publication-status.ts`: las dos features tienen el mismo mecanismo
 * desde `20260831090000_promociones_journeys_doble_aprobacion.sql` y no
 * pueden importarse entre sí (CLAUDE.md §2). Cupones tiene su propio flujo
 * de doble aprobación aparte (`features/coupons/lib/thresholds.ts`) porque
 * el suyo se dispara por umbral, no por rol — no hay nada real que
 * compartir con este.
 */

/**
 * Quién publica directo, sin pasar por una solicitud. Espejo de
 * `current_rol_base() = 'admin'` en la migración — sirve para que la UI
 * anticipe el resultado ("Publicar" vs. "Enviar a aprobación"); la
 * autorización real vive en el trigger de Postgres
 * (`guard_promotion_publication_transition` /
 * `guard_workflow_publication_transition`), no aquí.
 */
export function canPublishDirectly(rolBase: string | null): boolean {
  return rolBase === "admin"
}

/**
 * Cuatro ojos, también en la UI: quien solicitó una aprobación nunca ve
 * Aprobar/Rechazar sobre su propia solicitud, solo Retirar — aunque su rol
 * tenga el permiso `aprobar`. La regla inapelable vive en
 * `decide_promotion_approval` / `decide_workflow_approval` (rechazan la
 * decisión aunque esto se sortee); esto solo evita ofrecer en pantalla un
 * botón que el servidor rechazaría.
 */
export function canDecideApproval(params: {
  hasApprovePermission: boolean
  requestedBy: string
  viewerId: string
}): boolean {
  return params.hasApprovePermission && params.requestedBy !== params.viewerId
}

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  withdrawn: "Retirada",
}

/** Mismos colores que `COUPON_APPROVAL_STATUS_DOT` (cupones tiene su propia copia — features aisladas). */
export const APPROVAL_STATUS_DOT: Record<ApprovalStatus, string> = {
  pending: "bg-warning",
  approved: "bg-success",
  rejected: "bg-destructive",
  withdrawn: "bg-muted-foreground",
}
