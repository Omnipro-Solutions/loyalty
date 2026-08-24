import type { CouponOrigin } from "@/types/domain"

export const COUPON_STEP_IDS = [
  "origin",
  "recipient",
  "audience",
  "quantity",
  "file",
  "points",
  "coupon",
  "authorization",
  "review",
] as const
export type CouponStepId = (typeof COUPON_STEP_IDS)[number]

export type CouponStep = {
  id: CouponStepId
  label: string
}

const STEP_LABEL: Record<CouponStepId, string> = {
  origin: "Origen",
  recipient: "Destinatario",
  audience: "Audiencia",
  quantity: "Lote",
  file: "Archivo",
  points: "Puntos",
  coupon: "Cupón",
  authorization: "Autorización",
  review: "Revisar y emitir",
}

export const STEP_BY_ID: Record<CouponStepId, CouponStep> = Object.fromEntries(
  COUPON_STEP_IDS.map((id) => [id, { id, label: STEP_LABEL[id] }])
) as Record<CouponStepId, CouponStep>

/**
 * Único lugar del módulo donde el ORIGEN decide qué pasos existen (doc
 * §4.2: "Origen → Destinatario/Audiencia/Lote/Archivo → (Puntos) → Cupón →
 * Autorización → Revisar y emitir"). Pura y testeable: la secuencia
 * completa de un origen es una sola llamada, sin React ni estado.
 */
export function stepsForOrigin(origin: CouponOrigin): CouponStep[] {
  const middle: CouponStepId[] =
    origin === "manual_customer"
      ? ["recipient"]
      : origin === "manual_bearer"
        ? []
        : origin === "points_redemption"
          ? ["recipient", "points"]
          : origin === "batch_audience"
            ? ["audience"]
            : origin === "batch_anonymous"
              ? ["quantity"]
              : ["file"] // csv_import

  const ids: CouponStepId[] = [
    "origin",
    ...middle,
    "coupon",
    "authorization",
    "review",
  ]
  return ids.map((id) => STEP_BY_ID[id])
}
