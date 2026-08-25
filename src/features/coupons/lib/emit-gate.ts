import type {
  CouponBatchStatus,
  CouponDiscountType,
  CouponOrigin,
} from "@/types/domain"

export const EMIT_BLOCKERS = [
  "missing_name",
  "missing_recipient",
  "missing_audience",
  "missing_quantity",
  "missing_file",
  "missing_discount",
  "missing_issue_reason",
  "awaiting_approval",
  "approval_rejected",
  "no_other_approver",
] as const
export type EmitBlocker = (typeof EMIT_BLOCKERS)[number]

/** Copia del checklist de "Revisar y emitir" (doc §4.2), cada uno enlaza al paso que falta. */
export const EMIT_BLOCKER_COPY: Record<
  EmitBlocker,
  { message: string; stepId: string }
> = {
  missing_name: { message: "Falta el nombre de la emisión.", stepId: "coupon" },
  missing_recipient: {
    message: "Elige el cliente titular.",
    stepId: "recipient",
  },
  missing_audience: {
    message: "Elige una audiencia.",
    stepId: "audience",
  },
  missing_quantity: {
    message: "Indica cuántos códigos generar.",
    stepId: "quantity",
  },
  missing_file: {
    message: "Sube un archivo con al menos una fila.",
    stepId: "file",
  },
  missing_discount: {
    message: "Completa el valor del descuento.",
    stepId: "coupon",
  },
  missing_issue_reason: {
    message: "El motivo de emisión es obligatorio.",
    stepId: "authorization",
  },
  awaiting_approval: {
    message: "Esta emisión ya tiene una solicitud de aprobación pendiente.",
    stepId: "authorization",
  },
  approval_rejected: {
    message:
      "La solicitud de aprobación anterior fue rechazada — revisa y vuelve a solicitar.",
    stepId: "authorization",
  },
  no_other_approver: {
    message:
      "No hay nadie más en la organización con permiso para aprobar cupones.",
    stepId: "authorization",
  },
}

/**
 * `coupon_approval.status` aún no tiene tupla propia en src/types/domain.ts
 * (la agrega la migración del flujo de aprobación) — se inlinea aquí y se
 * alinea cuando esa tupla exista.
 */
export type EmitApprovalStatus =
  "pending" | "approved" | "rejected" | "revoked" | "withdrawn" | null

export type EmitGateInput = {
  status: CouponBatchStatus
  requiresApproval: boolean
  latestApprovalStatus: EmitApprovalStatus
  hasOtherApprovers: boolean
  blockers: EmitBlocker[]
}

export type EmitIntent = "emit" | "request_approval" | "blocked"

export type EmitGate = {
  intent: EmitIntent
  blockers: EmitBlocker[]
}

export type MissingFieldCheck = {
  origin: CouponOrigin
  name: string
  memberId?: string
  audienceSegmentId?: string
  requestedQuantity?: number
  importRowCount: number
  discountType: CouponDiscountType
  discountValue: number
  freeProductId?: string
  issueReason: string
}

/**
 * Campos obligatorios del asistente (doc §4.2), como códigos — no strings —
 * para que el panel "Antes de emitir" y el paso "Revisar y emitir" compartan
 * un solo origen de verdad con `EMIT_BLOCKER_COPY` (mensaje + paso al que
 * saltar). El resto de `EMIT_BLOCKERS` (los de aprobación) los añade
 * `evaluateEmitGate`, no esta función — aquí solo lo que depende del
 * formulario, no del estado del batch.
 */
export function computeMissingFieldBlockers(
  input: MissingFieldCheck
): EmitBlocker[] {
  const blockers: EmitBlocker[] = []

  if (!input.name) blockers.push("missing_name")
  if (
    (input.origin === "manual_customer" ||
      input.origin === "points_redemption") &&
    !input.memberId
  ) {
    blockers.push("missing_recipient")
  }
  if (input.origin === "batch_audience" && !input.audienceSegmentId) {
    blockers.push("missing_audience")
  }
  if (input.origin === "batch_anonymous" && !input.requestedQuantity) {
    blockers.push("missing_quantity")
  }
  if (input.origin === "csv_import" && input.importRowCount === 0) {
    blockers.push("missing_file")
  }

  const invalidDiscount =
    (input.discountType === "free_product" && !input.freeProductId) ||
    (input.discountType === "percentage" &&
      (input.discountValue < 1 || input.discountValue > 100)) ||
    (input.discountType === "fixed_amount" && input.discountValue <= 0)
  if (invalidDiscount) blockers.push("missing_discount")

  if (!input.issueReason) blockers.push("missing_issue_reason")

  return blockers
}

/**
 * Decide qué botón se pinta en "Revisar y emitir" y qué bloqueos mostrar —
 * alimenta a la vez el checklist del doc §4.2, la etiqueta del botón y la
 * guarda de la Server Action (que SIEMPRE recalcula esto en servidor sobre
 * los valores actuales del batch, nunca confía en lo que envía el cliente).
 */
export function evaluateEmitGate(input: EmitGateInput): EmitGate {
  if (input.status !== "draft") {
    return { intent: "blocked", blockers: input.blockers }
  }

  const blockers = [...input.blockers]

  if (input.requiresApproval) {
    if (input.latestApprovalStatus === "pending") {
      blockers.push("awaiting_approval")
    }
    if (!input.hasOtherApprovers) {
      blockers.push("no_other_approver")
    }
  }

  if (blockers.length > 0) {
    return { intent: "blocked", blockers }
  }

  return {
    intent: input.requiresApproval ? "request_approval" : "emit",
    blockers: [],
  }
}
