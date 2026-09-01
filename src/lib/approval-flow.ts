import type {
  ApprovalStatus,
  DecisionReason,
  SelectablePublicationStatus,
} from "@/types/domain"

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
 * Nada llega a `activa` sin una aprobación registrada — tampoco si lo
 * publica un administrador. Antes existía `canPublishDirectly(rolBase)`, que
 * dejaba pasar directo a `rol_base = 'admin'`; ese atajo se retiró porque
 * convertía la doble aprobación en opcional justo para quien más alcance
 * tiene. Con la regla de cuatro ojos intacta
 * (`canDecideApproval`, `decide_*_approval`), publicar exige ahora siempre a
 * dos personas distintas.
 *
 * Cubre CUALQUIER entrada a `activa`, no solo la primera publicación:
 * reactivar una promoción pausada vuelve a pedir firma. Por eso la firma
 * recibe el destino y no el rol.
 *
 * No hace falta excluir `pendiente_aprobacion → activa`: esa transición no
 * la puede pedir un cliente (`ALLOWED_STATUS_TRANSITIONS.pendiente_aprobacion`
 * está vacío), solo la ejecuta `decide_*_approval` por dentro.
 *
 * La autorización real vive en los triggers de Postgres
 * (`guard_promotion_publication_transition` /
 * `guard_workflow_publication_transition`); esto evita que la app intente
 * el camino que el trigger rechazaría.
 */
export function requiresApproval(to: SelectablePublicationStatus): boolean {
  return to === "activa"
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

/**
 * Copy de cada motivo de decisión. Vive aquí y no en cada feature porque la
 * bandeja de `/aprobaciones` mezcla los tres dominios en una sola lista: si
 * cada una trajera su propia traducción, la misma decisión se leería distinta
 * según de dónde viniera la fila.
 */
export const DECISION_REASON_LABEL: Record<DecisionReason, string> = {
  cumple_politica: "Cumple la política",
  urgencia_comercial: "Urgencia comercial",
  revisado_con_solicitante: "Revisado con quien lo pidió",
  error_configuracion: "Error de configuración",
  fuera_de_politica: "Fuera de política",
  presupuesto: "Presupuesto",
  requiere_ajustes: "Requiere ajustes",
  otro: "Otro",
}
