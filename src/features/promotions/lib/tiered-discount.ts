import type {
  DiscountTierCalculationMode,
  DiscountTierThresholdType,
} from "@/types/domain"

/**
 * Evaluador puro de `descuento_escalonado` (docs/promociones.md §7.1a),
 * versión **transaccional**: los escalones se evalúan contra un solo
 * carrito (unidades o monto alcanzados en una compra) — no contra el
 * comportamiento acumulado del cliente en el tiempo (§7.1b, que es un
 * programa de niveles de lealtad y extiende `cambio_nivel` en
 * `features/builder`, no esta mecánica).
 *
 * Sin I/O, mismo espíritu que `builder/engine/simulate.ts` — la acción de
 * servidor y el futuro motor de checkout solo resuelven los datos
 * (`TieredDiscountCart`) y delegan el cálculo aquí.
 */

export type DiscountTier = { umbral: number; beneficio_valor: number }

export type TieredDiscountConfig = {
  tiers: DiscountTier[]
  thresholdType: DiscountTierThresholdType
  calculationMode: DiscountTierCalculationMode
  /** Tope absoluto sobre el descuento final — `promociones.tope_maximo`. */
  maxCap?: number | null
}

/** Un solo carrito — versión transaccional. */
export type TieredDiscountCart = {
  /** Unidades que califican para la promoción. */
  units: number
  /** Monto que califica (base sobre la que se descuenta). */
  amount: number
}

export type TieredDiscountBracket = {
  from: number
  /** Exclusivo; `null` en el último tramo. */
  to: number | null
  rate: number
  /** Parte del carrito dentro del tramo (unidades o monto, según `thresholdType`). */
  quantity: number
  discount: number
}

export type TieredDiscountResult = {
  discount: number
  /** Índice dentro de `sortedTiers`, o `null` si no alcanza ningún escalón. */
  reachedTierIndex: number | null
  reachedTier: DiscountTier | null
  /** Escalones normalizados (ordenados y sin duplicados) usados en el cálculo. */
  sortedTiers: DiscountTier[]
  brackets: TieredDiscountBracket[]
  /** % efectivo sobre `cart.amount` — ej. para explicar "equivale a 13,4 %". */
  effectiveRate: number
  cappedByMax: boolean
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function sanitizeNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Descarta escalones inválidos, ordena por `umbral` ascendente y, ante un
 * `umbral` duplicado, conserva el de mayor `beneficio_valor` — determinista,
 * sin depender del orden de entrada. El formulario ya rechaza duplicados
 * (ver `schemas.ts`), pero esta función debe sobrevivir una fila editada a
 * mano en la base.
 */
export function normalizeTiers(tiers: DiscountTier[]): DiscountTier[] {
  const byUmbral = new Map<number, DiscountTier>()
  for (const tier of tiers) {
    if (!Number.isFinite(tier.umbral) || tier.umbral <= 0) continue
    if (!Number.isFinite(tier.beneficio_valor) || tier.beneficio_valor <= 0)
      continue
    const existing = byUmbral.get(tier.umbral)
    if (!existing || tier.beneficio_valor > existing.beneficio_valor) {
      byUmbral.set(tier.umbral, tier)
    }
  }
  return [...byUmbral.values()].sort((a, b) => a.umbral - b.umbral)
}

const EMPTY_RESULT: Omit<TieredDiscountResult, "sortedTiers"> = {
  discount: 0,
  reachedTierIndex: null,
  reachedTier: null,
  brackets: [],
  effectiveRate: 0,
  cappedByMax: false,
}

export function computeTieredDiscount(
  config: TieredDiscountConfig,
  cart: TieredDiscountCart
): TieredDiscountResult {
  const sortedTiers = normalizeTiers(config.tiers)
  const units = sanitizeNonNegative(cart.units)
  const amount = sanitizeNonNegative(cart.amount)
  const metric = config.thresholdType === "unidades" ? units : amount

  if (sortedTiers.length === 0) {
    return { ...EMPTY_RESULT, sortedTiers }
  }

  // Último escalón cuyo umbral es <= la métrica — "mayor o igual a", igual
  // al operador que ya usa `monto_carrito` (`CONDITION_FIELD_OPERATOR`).
  let reachedTierIndex: number | null = null
  for (let i = 0; i < sortedTiers.length; i++) {
    if (sortedTiers[i].umbral <= metric) reachedTierIndex = i
  }

  if (reachedTierIndex === null) {
    return { ...EMPTY_RESULT, sortedTiers }
  }

  const reachedTier = sortedTiers[reachedTierIndex]
  let discount: number
  let brackets: TieredDiscountBracket[]

  if (config.calculationMode === "escalon_unico") {
    discount = (amount * reachedTier.beneficio_valor) / 100
    brackets = [
      {
        from: reachedTier.umbral,
        to: null,
        rate: reachedTier.beneficio_valor,
        quantity: metric,
        discount,
      },
    ]
  } else {
    // Progresivo: suma por tramos [umbral_i, umbral_{i+1}) hasta el
    // escalón alcanzado — sin salto, cada unidad/peso extra da un poco más.
    // Con `thresholdType = "monto"` el tramo es directo. Con "unidades" no
    // hay líneas de carrito en esta versión transaccional simple, así que
    // se usa un precio promedio (`amount / units`) para valorar cada
    // unidad del tramo — un motor real con líneas de carrito discriminaría
    // qué unidades exactas caen en cada tramo.
    const avgUnitPrice = units > 0 ? amount / units : 0
    brackets = []
    let total = 0
    for (let i = 0; i <= reachedTierIndex; i++) {
      const tier = sortedTiers[i]
      const next = sortedTiers[i + 1]?.umbral ?? null
      const bracketEnd = next !== null ? Math.min(metric, next) : metric
      const quantity = Math.max(0, bracketEnd - tier.umbral)
      const bracketDiscount =
        config.thresholdType === "monto"
          ? (quantity * tier.beneficio_valor) / 100
          : (quantity * avgUnitPrice * tier.beneficio_valor) / 100
      brackets.push({
        from: tier.umbral,
        to: next,
        rate: tier.beneficio_valor,
        quantity,
        discount: round2(bracketDiscount),
      })
      total += bracketDiscount
    }
    discount = total
  }

  let cappedByMax = false
  if (config.maxCap != null && config.maxCap > 0 && discount > config.maxCap) {
    discount = config.maxCap
    cappedByMax = true
  }

  discount = round2(discount)
  const effectiveRate = amount > 0 ? round2((discount / amount) * 100) : 0

  return {
    discount,
    reachedTierIndex,
    reachedTier,
    sortedTiers,
    brackets,
    effectiveRate,
    cappedByMax,
  }
}
