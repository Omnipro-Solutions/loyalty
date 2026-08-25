import type {
  CouponActorType,
  CouponApprovalStatus,
  CouponAssignmentRole,
  CouponAssignmentSource,
  CouponAudienceMode,
  CouponBatchStatus,
  CouponCancelReasonCode,
  CouponDeliveryChannel,
  CouponDiscountType,
  CouponDisplayStatus,
  CouponEventType,
  CouponOrigin,
  CouponPointsChargeTiming,
  CouponPrintLayout,
  CouponRedemptionResult,
  CouponSearchScope,
} from "@/types/domain"

import { formatShortDate, formatTime } from "@/lib/format"

import type { ApprovalThresholdReason } from "./thresholds"

export const COUPON_SEARCH_SCOPE_LABEL: Record<CouponSearchScope, string> = {
  all: "Todo",
  code: "ID cupón",
  person: "Persona",
  batch: "Emisión",
}

export const COUPON_ORIGIN_LABEL: Record<CouponOrigin, string> = {
  manual_customer: "Manual · cliente identificado",
  manual_bearer: "Manual · al portador",
  points_redemption: "Canje de puntos",
  batch_audience: "Batch · audiencia CDP",
  batch_anonymous: "Batch · lote anónimo",
  csv_import: "Importar CSV",
}

export const COUPON_BATCH_STATUS_LABEL: Record<CouponBatchStatus, string> = {
  draft: "Borrador",
  pending_approval: "Esperando aprobación",
  generating: "Generando",
  issued: "Emitida",
  closed: "Cerrada",
  cancelled: "Anulada",
}

/** Punto de color de la tabla y los chips de emisiones. */
export const COUPON_BATCH_STATUS_DOT: Record<CouponBatchStatus, string> = {
  draft: "bg-muted-foreground",
  pending_approval: "bg-warning",
  generating: "bg-primary",
  issued: "bg-success",
  closed: "bg-border-strong",
  cancelled: "bg-destructive",
}

export const COUPON_DISPLAY_STATUS_LABEL: Record<CouponDisplayStatus, string> =
  {
    draft: "Borrador",
    issued: "Emitido",
    assigned: "Asignado",
    redeemed: "Usado",
    expired: "Expirado",
    cancelled: "Anulado",
  }

/** Chips de estado de 13.2 ("Emitidos", "Usados"…) — plural, a diferencia de la insignia por fila (`COUPON_DISPLAY_STATUS_LABEL`, singular: "Emitido"). */
export const COUPON_DISPLAY_STATUS_CHIP_LABEL: Record<
  CouponDisplayStatus,
  string
> = {
  draft: "Borradores",
  issued: "Emitidos",
  assigned: "Asignados",
  redeemed: "Usados",
  expired: "Caducados",
  cancelled: "Anulados",
}

/** Chips de estado de 13.1 ("Emitidas", "Cerradas"…) — plural femenino (se refiere a emisiones), a diferencia de la insignia por fila (`COUPON_BATCH_STATUS_LABEL`, singular: "Emitida"). */
export const COUPON_BATCH_STATUS_CHIP_LABEL: Record<CouponBatchStatus, string> =
  {
    draft: "Borrador",
    pending_approval: "Esperando aprobación",
    generating: "Generando",
    issued: "Emitidas",
    closed: "Cerradas",
    cancelled: "Anuladas",
  }

/** Punto de color de la tabla de cupones. */
export const COUPON_DISPLAY_STATUS_DOT: Record<CouponDisplayStatus, string> = {
  draft: "bg-muted-foreground",
  issued: "bg-primary",
  assigned: "bg-success",
  redeemed: "bg-data-teal",
  expired: "bg-border-strong",
  cancelled: "bg-destructive",
}

export const COUPON_DISCOUNT_TYPE_LABEL: Record<CouponDiscountType, string> = {
  percentage: "Descuento porcentual",
  fixed_amount: "Descuento de monto fijo",
  free_product: "Producto gratis",
}

export const COUPON_AUDIENCE_MODE_LABEL: Record<CouponAudienceMode, string> = {
  dynamic: "Al emitir (dinámica)",
  frozen: "Congelar ahora",
}

/** "dinámica"/"congelada" — sufijo corto para subcabeceras (fila expandida de 13.1, resumen del paso "Audiencia" del asistente), distinto de `COUPON_AUDIENCE_MODE_LABEL` (más largo). */
export function audienceModeShort(mode: string): string {
  return mode === "dynamic" ? "dinámica" : "congelada"
}

/** "Nombre · 24 ago 2026, 14:20" — quién hizo algo y cuándo, usado por las tarjetas de "Emisión de origen"/fila expandida (autorizó, aprobó). */
export function formatActorAt(nombre: string, at: string): string {
  return `${nombre} · ${formatShortDate(at)}, ${formatTime(at)}`
}

export const COUPON_POINTS_CHARGE_TIMING_LABEL: Record<
  CouponPointsChargeTiming,
  string
> = {
  on_create: "Al crear el cupón",
  on_redeem: "Al usar el cupón",
}

export const COUPON_DELIVERY_CHANNEL_LABEL: Record<
  CouponDeliveryChannel,
  string
> = {
  email: "Email",
  sms: "SMS",
  print: "Impreso",
}

export const COUPON_CANCEL_REASON_LABEL: Record<
  CouponCancelReasonCode,
  string
> = {
  issued_in_error: "Emitido por error",
  duplicate: "Duplicado",
  suspected_fraud: "Sospecha de fraude",
  customer_request: "Petición del cliente",
  other: "Otro",
}

export const COUPON_ASSIGNMENT_ROLE_LABEL: Record<
  CouponAssignmentRole,
  string
> = {
  holder: "Titular actual",
  previous_holder: "Titular anterior",
  issuer: "Emisor",
}

export const COUPON_ASSIGNMENT_SOURCE_LABEL: Record<
  CouponAssignmentSource,
  string
> = {
  manual: "Manual",
  rule: "Regla",
  journey: "Loyalty Builder",
  redemption: "Redención",
  csv: "Importación CSV",
}

export const COUPON_REDEMPTION_RESULT_LABEL: Record<
  CouponRedemptionResult,
  string
> = {
  applied: "Aplicado",
  rejected: "Rechazado",
  validated: "Validado",
}

export const COUPON_REDEMPTION_RESULT_DOT: Record<
  CouponRedemptionResult,
  string
> = {
  applied: "bg-success",
  rejected: "bg-destructive",
  validated: "bg-primary",
}

/** Mismo conjunto que `SALES_CHANNEL_LABEL` de `features/members` — duplicado a propósito, las features no se importan entre sí (CLAUDE.md §2). */
export const COUPON_REDEMPTION_CHANNEL_LABEL: Record<
  "pos" | "ecommerce" | "app",
  string
> = {
  pos: "POS",
  ecommerce: "E-commerce",
  app: "App",
}

export const COUPON_EVENT_TYPE_LABEL: Record<CouponEventType, string> = {
  batch_created: "Emisión creada",
  authorization_signed: "Autorización firmada",
  approval_requested: "Aprobación solicitada",
  approval_granted: "Aprobación concedida",
  approval_rejected: "Aprobación rechazada",
  approval_revoked: "Aprobación revocada",
  approval_withdrawn: "Solicitud retirada",
  generation_started: "Generación iniciada",
  generation_completed: "Generación completada",
  issued: "Emitido",
  assigned: "Asignado",
  unassigned: "Desasignado",
  validity_extended: "Vigencia extendida",
  delivered: "Entregado",
  viewed: "Visualizado",
  redeemed: "Canjeado",
  redemption_rejected: "Redención rechazada",
  expired: "Expirado",
  cancelled: "Anulado",
  printed: "Impreso",
  exported: "Exportado",
}

/** Punto de color de la línea de tiempo (13.4 "Log de eventos") — verde lo positivo, rojo lo rechazado/anulado, marca lo que exige una firma, gris el resto. */
export const COUPON_EVENT_TYPE_DOT: Record<CouponEventType, string> = {
  batch_created: "bg-foreground",
  authorization_signed: "bg-primary",
  approval_requested: "bg-warning",
  approval_granted: "bg-success",
  approval_rejected: "bg-destructive",
  approval_revoked: "bg-destructive",
  approval_withdrawn: "bg-muted-foreground",
  generation_started: "bg-muted-foreground",
  generation_completed: "bg-foreground",
  issued: "bg-primary",
  assigned: "bg-primary",
  unassigned: "bg-muted-foreground",
  validity_extended: "bg-primary",
  delivered: "bg-muted-foreground",
  viewed: "bg-muted-foreground",
  redeemed: "bg-success",
  redemption_rejected: "bg-destructive",
  expired: "bg-muted-foreground",
  cancelled: "bg-destructive",
  printed: "bg-muted-foreground",
  exported: "bg-muted-foreground",
}

export const COUPON_ACTOR_TYPE_LABEL: Record<CouponActorType, string> = {
  user: "Usuario",
  system: "Sistema",
  rule: "Regla",
  journey: "Loyalty Builder",
  store: "Tienda",
}

export const COUPON_PRINT_LAYOUT_LABEL: Record<CouponPrintLayout, string> = {
  grid_8: "Cuadrícula 8 por hoja",
  single_page: "Un vale por hoja",
}

export const APPROVAL_THRESHOLD_REASON_LABEL: Record<
  ApprovalThresholdReason,
  string
> = {
  volume: "Más de 500 códigos",
  unit_value: "Valor unitario alto",
  points_cost: "Canje de 2.500 puntos o más",
}

export const COUPON_APPROVAL_STATUS_LABEL: Record<
  CouponApprovalStatus,
  string
> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  withdrawn: "Retirada",
}

export const COUPON_APPROVAL_STATUS_DOT: Record<CouponApprovalStatus, string> =
  {
    pending: "bg-warning",
    approved: "bg-success",
    rejected: "bg-destructive",
    withdrawn: "bg-muted-foreground",
  }
