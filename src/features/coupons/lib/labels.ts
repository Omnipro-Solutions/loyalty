import type {
  CouponActorType,
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
} from "@/types/domain"

import type { ApprovalThresholdReason } from "./thresholds"

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

export const COUPON_DISPLAY_STATUS_LABEL: Record<CouponDisplayStatus, string> =
  {
    draft: "Borrador",
    issued: "Emitido",
    assigned: "Asignado",
    redeemed: "Canjeado",
    expired: "Expirado",
    cancelled: "Anulado",
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
  redeemed: "Canjeado",
  redemption_rejected: "Redención rechazada",
  expired: "Expirado",
  cancelled: "Anulado",
  printed: "Impreso",
  exported: "Exportado",
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
