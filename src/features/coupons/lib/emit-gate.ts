import type { CouponBatchStatus } from "@/types/domain"

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
