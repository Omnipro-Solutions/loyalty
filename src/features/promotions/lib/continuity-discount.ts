import type {
  ContinuityBreakBehavior,
  ContinuityWindowUnit,
} from "@/types/domain"

/**
 * Evaluador puro de `descuento_continuidad` — la escalera de descuento que
 * crece con cada compra consecutiva del cliente dentro de una ventana de
 * días (docs/modalidades-promocion-contexto.md, variante V11 "Escalera de
 * racha o adherencia", líneas 1962-1978). Igual que `tiered-discount.ts`,
 * sin I/O: alimenta el preview en vivo del formulario, no un motor de
 * checkout — no hay contador por cliente detrás (ver el aviso de alcance
 * en `20260826180000_promociones_continuidad.sql`), así que quien llama
 * esta función es responsable de pasarle el estado (`previousTier`,
 * `daysSincePrevious`) que en un motor real vendría de un contador
 * persistente por socio.
 */

export type ContinuityTier = { umbral: number; beneficio_valor: number }

/**
 * Días que vale cada unidad de ventana. `meses` y `bimestres` se aproximan
 * a 30 y 60 días: esta librería es pura y no conoce la fecha de la compra,
 * así que no puede contar meses de calendario. La aproximación se declara
 * aquí, en un solo sitio y bajo test, en vez de repetirse en el SQL y en
 * cada consumidor.
 */
export const CONTINUITY_WINDOW_UNIT_DAYS: Record<ContinuityWindowUnit, number> =
  {
    dias: 1,
    semanas: 7,
    meses: 30,
    bimestres: 60,
  }

/** Ventana declarada (cantidad + unidad) en días — 0 si falta la cantidad. */
export function continuityWindowInDays(
  amount: number | undefined,
  unit: ContinuityWindowUnit | undefined
): number {
  if (!amount || amount <= 0) return 0
  return amount * CONTINUITY_WINDOW_UNIT_DAYS[unit ?? "dias"]
}

export type ContinuityDiscountConfig = {
  tiers: ContinuityTier[]
  /** Días máximos entre dos compras consecutivas para conservar el avance. */
  windowDays: number
  onBreak: ContinuityBreakBehavior
}

export type ContinuityPurchase = {
  /** Escalón alcanzado en la compra anterior — 0 si no hay compra anterior. */
  previousTier: number
  /** Días desde la compra anterior — `null` si no hay compra anterior (primera compra). */
  daysSincePrevious: number | null
}

export type ContinuityDiscountResult = {
  /** Escalón alcanzado por ESTA compra (1-based), 0 si no hay escalones configurados. */
  tier: number
  /** `beneficio_valor` del escalón alcanzado. */
  discount: number
  /** Si esta compra excedió la ventana de continuidad respecto a la anterior. */
  brokeContinuity: boolean
  /** Escalones normalizados (ordenados y sin duplicados) usados en el cálculo. */
  sortedTiers: ContinuityTier[]
  maxTier: number
}

/**
 * Descarta escalones inválidos, ordena por `umbral` ascendente y, ante un
 * `umbral` duplicado, conserva el de mayor `beneficio_valor` — mismo
 * criterio que `normalizeTiers` de `tiered-discount.ts`.
 */
export function normalizeContinuityTiers(
  tiers: ContinuityTier[]
): ContinuityTier[] {
  const byUmbral = new Map<number, ContinuityTier>()
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

const EMPTY_RESULT: Omit<ContinuityDiscountResult, "sortedTiers"> = {
  tier: 0,
  discount: 0,
  brokeContinuity: false,
  maxTier: 0,
}

export function computeContinuityDiscount(
  config: ContinuityDiscountConfig,
  purchase: ContinuityPurchase
): ContinuityDiscountResult {
  const sortedTiers = normalizeContinuityTiers(config.tiers)
  const maxTier = sortedTiers.length

  if (maxTier === 0) {
    return { ...EMPTY_RESULT, sortedTiers }
  }

  const isFirstPurchase =
    purchase.previousTier <= 0 || purchase.daysSincePrevious === null
  const brokeContinuity =
    !isFirstPurchase &&
    purchase.daysSincePrevious !== null &&
    purchase.daysSincePrevious > config.windowDays

  let tier: number
  if (isFirstPurchase) {
    tier = 1
  } else if (brokeContinuity) {
    tier =
      config.onBreak === "mantener"
        ? purchase.previousTier
        : config.onBreak === "retroceder_un_escalon"
          ? Math.max(1, purchase.previousTier - 1)
          : 1 // "reiniciar"
  } else {
    tier = purchase.previousTier + 1
  }
  tier = Math.min(tier, maxTier)

  return {
    tier,
    discount: sortedTiers[tier - 1].beneficio_valor,
    brokeContinuity,
    sortedTiers,
    maxTier,
  }
}
