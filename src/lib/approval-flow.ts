import type {
  ApprovalStatus,
  DecisionReason,
  SelectablePublicationStatus,
  StatusChangeReason,
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
 * (`canDecideApproval`, `decide_*_approval`), publicar exige dos personas
 * distintas — salvo que un rol personalizado tenga el permiso opt-in
 * `autoaprobar` sobre ese recurso, que es la única excepción y se concede a
 * mano (ver `approvalBlock` más abajo). Lo que NO volvió es el atajo por
 * archetype: seguir siendo admin no concede nada.
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

/** Por qué una solicitud no se puede decidir. `null` = sí se puede. */
export type ApprovalBlock = "propia" | "sin_permiso"

/**
 * Cuatro ojos, también en la UI: quien solicitó una aprobación no ve
 * Aprobar/Rechazar sobre su propia solicitud, solo Retirar — aunque su rol
 * tenga el permiso `aprobar`.
 *
 * La excepción es `autoaprobar` (`hasSelfApprovePermission`), un permiso
 * opt-in que solo se concede a mano sobre roles personalizados y que exige
 * `aprobar` sobre el mismo recurso — ver `OPT_IN_ACTIONS` en
 * `lib/permissions.ts` y `20260907160000_autoaprobacion_opt_in.sql`. Existe
 * para el caso en que la persona ES la organización (demo, tenant de un solo
 * operador, org recién creada sin segundo aprobador), donde la regla de
 * cuatro ojos no protege de nada y solo deja todo atascado en
 * `pendiente_aprobacion`.
 *
 * La regla inapelable vive en `decide_*_approvals` (SQL), que consulta el
 * mismo par de permisos vía `can_self_approve()` y salta la fila si no
 * están; esto solo evita ofrecer en pantalla un botón que el servidor
 * rechazaría. El permiso pesa más que la regla de cuatro ojos en el mensaje:
 * si el rol no aprueba ese tipo, que además sea tuya no cambia nada.
 */
export function approvalBlock(params: {
  hasApprovePermission: boolean
  hasSelfApprovePermission: boolean
  requestedBy: string | null
  viewerId: string
}): ApprovalBlock | null {
  if (!params.hasApprovePermission) return "sin_permiso"
  if (
    params.requestedBy === params.viewerId &&
    !params.hasSelfApprovePermission
  )
    return "propia"
  return null
}

export function canDecideApproval(params: {
  hasApprovePermission: boolean
  hasSelfApprovePermission: boolean
  requestedBy: string
  viewerId: string
}): boolean {
  return approvalBlock(params) === null
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

/**
 * Copy del motivo que dejó QUIEN PIDIÓ la firma (`codigo_motivo`), que es
 * distinto de por qué se decidió (`DECISION_REASON_LABEL`, arriba). Son las
 * dos mitades de la conversación y la bandeja necesita las dos: un
 * aprobador que solo ve «Carlos, hace 2 h» tiene que adivinar por qué se lo
 * pidieron.
 *
 * Misma tabla de valores que `STATUS_CHANGE_REASONS`, porque pedir publicar
 * ES un cambio de estado. Vive aquí y no en `features/promotions` para que
 * los tres dominios de la bandeja lean el mismo texto.
 */
export const REQUEST_REASON_LABEL: Record<StatusChangeReason, string> = {
  decision_comercial: "Decisión comercial",
  presupuesto: "Presupuesto",
  error_configuracion: "Error de configuración",
  bajo_rendimiento: "Bajo rendimiento",
  fin_de_campana: "Fin de campaña",
  otro: "Otro (especificar)",
}

/**
 * Cuánto lleva esperando una solicitud, en tramos.
 *
 * Existe porque una cola donde todas las filas se ven igual no dice lo
 * único urgente que hay que saber: qué lleva días parado. Y aquí «parado»
 * tiene consecuencia real — mientras nadie firma, la promoción no publica.
 *
 * Los cortes son en días y no en horas porque el ciclo de esta bandeja es
 * diario: alguien la abre por la mañana. Menos de un día es normal, más de
 * tres es un problema del proceso, no de la solicitud.
 */
export type WaitingLevel = "reciente" | "espera" | "atascada"

export function waitingLevel(
  requestedAt: string | Date,
  now: Date = new Date()
): WaitingLevel {
  const requested =
    typeof requestedAt === "string" ? new Date(requestedAt) : requestedAt
  const days = (now.getTime() - requested.getTime()) / 86_400_000
  if (days >= 3) return "atascada"
  if (days >= 1) return "espera"
  return "reciente"
}
