import type { ConditionRule } from "./condition-preview"

/**
 * Condición interna de "Acumular puntos" (`docs/builder.md` §8: cuando la
 * condición solo modifica el cálculo de una acción, no cambia el camino del
 * workflow, vive DENTRO del bloque en vez de forzar un `condicion_multiple`
 * + rama en el canvas por cada modificador). Reutiliza `ConditionRule` de
 * `condition-preview.ts` — misma forma, un solo tipo de regla en todo el
 * builder.
 */
export type Modifier = {
  id: string
  rule: ConditionRule
  multiplier: number
  /**
   * Si este modificador aplica en el ejemplo de la vista previa. No hay
   * motor real que evalúe `rule` contra un caso concreto todavía (mismo
   * alcance que el resto del builder — ver `engine/simulate.ts`), así que
   * el usuario lo marca a mano para ver el efecto en el cálculo de ejemplo.
   */
  previewActive: boolean
}

export type PointsBonus = {
  id: string
  rule: ConditionRule
  points: number
  previewActive: boolean
}

export type InvoiceBonus = {
  id: string
  /** Todas estas reglas se combinan con AND — un bono por factura (`docs/builder.md` §10, ej. "Fecha X + Hombre + >30") siempre exige que se cumplan varias condiciones a la vez. */
  rules: ConditionRule[]
  points: number
  previewActive: boolean
}

export const MODIFIERS_POLICIES = [
  "mayor",
  "multiplicativo",
  "incremental",
] as const
export type ModifiersPolicy = (typeof MODIFIERS_POLICIES)[number]

export const BONUS_POLICIES = [
  "acumular_todas",
  "mayor_prioridad",
  "primera_coincidencia",
] as const
export type BonusPolicy = (typeof BONUS_POLICIES)[number]

/**
 * Cómo se combinan los modificadores ACTIVOS entre sí (`docs/builder.md`
 * §13). Ejemplo con [2, 1.5]: mayor → 2, multiplicativo → 3, incremental →
 * 2.5 (1 + 1 + 0.5). Sin modificadores activos, el factor es 1 (neutro).
 */
export function combineMultipliers(
  multipliers: number[],
  policy: ModifiersPolicy
): number {
  if (multipliers.length === 0) return 1
  if (policy === "mayor") return Math.max(...multipliers)
  if (policy === "multiplicativo") {
    return multipliers.reduce((acc, m) => acc * m, 1)
  }
  return 1 + multipliers.reduce((acc, m) => acc + (m - 1), 0)
}

/**
 * Qué puntos de bono se cuentan entre los ACTIVOS (`docs/builder.md` §13).
 * El orden de la lista es el orden de prioridad/evaluación — "mayor
 * prioridad" y "primera coincidencia" dan el mismo resultado aquí porque ya
 * reciben solo los activos filtrados (un motor real que evalúe condiciones
 * sí distinguiría "evaluar en orden y parar en el primero" de "una
 * prioridad explícita independiente del orden"; esa distinción no aplica a
 * esta vista previa, que no evalúa `rule` por sí misma).
 */
export function selectBonusPoints(
  points: number[],
  policy: BonusPolicy
): number {
  if (points.length === 0) return 0
  if (policy === "acumular_todas") return points.reduce((a, b) => a + b, 0)
  return points[0]
}

export type AccumulationBreakdown = {
  basePoints: number
  afterTier: number
  modifierFactor: number
  afterModifiers: number
  itemBonusPerUnit: number
  itemBonusTotal: number
  invoiceBonusTotal: number
  beforeCap: number
  capApplied: boolean
  finalPoints: number
}

/**
 * Orden de cálculo determinístico (`docs/builder.md` §12): monto → puntos
 * base → multiplicador de nivel → modificadores → bonos por producto →
 * bonos por factura → tope → redondeo. Pura, sin I/O — mismo criterio que
 * `engine/simulate.ts`: mismas entradas, mismo resultado siempre.
 */
export function calculateAccumulatedPoints(input: {
  amount: number
  amountUnit: number
  tierMultiplier: number
  activeModifierMultipliers: number[]
  modifiersPolicy: ModifiersPolicy
  activeItemBonusPoints: number[]
  exampleQuantity: number
  activeInvoiceBonusPoints: number[]
  bonusPolicy: BonusPolicy
  capPerTransaction?: number
}): AccumulationBreakdown {
  const basePoints = Math.floor(input.amount / input.amountUnit)
  const afterTier = Math.round(basePoints * input.tierMultiplier)

  const modifierFactor = combineMultipliers(
    input.activeModifierMultipliers,
    input.modifiersPolicy
  )
  const afterModifiers = Math.round(afterTier * modifierFactor)

  const itemBonusPerUnit = selectBonusPoints(
    input.activeItemBonusPoints,
    input.bonusPolicy
  )
  const itemBonusTotal = itemBonusPerUnit * input.exampleQuantity

  const invoiceBonusTotal = selectBonusPoints(
    input.activeInvoiceBonusPoints,
    input.bonusPolicy
  )

  const beforeCap = afterModifiers + itemBonusTotal + invoiceBonusTotal
  const capApplied =
    typeof input.capPerTransaction === "number" &&
    beforeCap > input.capPerTransaction
  const finalPoints = capApplied ? input.capPerTransaction! : beforeCap

  return {
    basePoints,
    afterTier,
    modifierFactor,
    afterModifiers,
    itemBonusPerUnit,
    itemBonusTotal,
    invoiceBonusTotal,
    beforeCap,
    capApplied,
    finalPoints,
  }
}

/**
 * Resultado tipado del bloque (`docs/builder.md` §16-17) — solo los 3
 * códigos que este cálculo puede determinar de verdad a partir de
 * `AccumulationBreakdown`. El documento lista además `NOT_ELIGIBLE`,
 * `DUPLICATE_EVENT`, `INSUFFICIENT_DATA` y `ERROR`: ninguno tiene un dato
 * real detrás en este proyecto todavía (no hay elegibilidad configurable
 * dentro del bloque, no hay motor de idempotencia, no hay ejecución real
 * que pueda fallar) — modelarlos como puertos "de adorno" que nunca se
 * pueden alcanzar sería menos honesto que no tenerlos. Si el tope aplica Y
 * el resultado da 0, se reporta `CAP_REACHED` (explica el porqué del cero).
 */
export const RESULT_CODES = [
  "POINTS_GRANTED",
  "CAP_REACHED",
  "ZERO_POINTS",
] as const
export type ResultCode = (typeof RESULT_CODES)[number]

export const RESULT_CODE_LABELS: Record<ResultCode, string> = {
  POINTS_GRANTED: "Puntos acreditados",
  CAP_REACHED: "Se alcanzó un tope",
  ZERO_POINTS: "El cálculo resultó en cero",
}

export function resultCodeFor(
  breakdown: Pick<AccumulationBreakdown, "capApplied" | "finalPoints">
): ResultCode {
  if (breakdown.capApplied) return "CAP_REACHED"
  if (breakdown.finalPoints === 0) return "ZERO_POINTS"
  return "POINTS_GRANTED"
}
