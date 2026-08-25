import type { TierName } from "@/types/domain"

/**
 * Funciones puras para `multiplicador_puntos` y `bono_puntos` (docs
 * §6/§7). Aritmética simple — comparten un solo archivo en vez de uno cada
 * una porque ninguna justifica el tamaño de `tiered-discount.ts`/
 * `bxgy-discount.ts`, pero sí merecen quedar probadas.
 */

/**
 * `basePoints * multiplicador`, redondeado. `multiplicador` inválido
 * (≤0, `NaN`) deja los puntos base sin cambio — nunca reduce ni anula lo
 * que el producto ya otorgaba.
 */
export function computeMultipliedPoints(
  basePoints: number,
  multiplicador: number
): number {
  const base = Number.isFinite(basePoints) && basePoints > 0 ? basePoints : 0
  const factor =
    Number.isFinite(multiplicador) && multiplicador > 0 ? multiplicador : 1
  return Math.round(base * factor)
}

/**
 * Puntos de bono si el carrito alcanza `montoMinimoDisparo` — sin mínimo
 * declarado (`null`/`undefined`), el bono siempre aplica.
 */
export function computeBonusPoints(
  cartAmount: number,
  bonoPuntos: number,
  montoMinimoDisparo: number | null | undefined
): number {
  const bono = Number.isFinite(bonoPuntos) && bonoPuntos > 0 ? bonoPuntos : 0
  const amount = Number.isFinite(cartAmount) ? cartAmount : 0
  const threshold =
    montoMinimoDisparo != null && Number.isFinite(montoMinimoDisparo)
      ? montoMinimoDisparo
      : 0
  if (amount < threshold) return 0
  return bono
}

/**
 * Sin niveles requeridos declarados (arreglo vacío), la mecánica califica
 * para cualquier nivel — mismo criterio que un `limites` vacío = sin tope
 * de uso.
 */
export function memberQualifiesForTier(
  memberTier: TierName | null | undefined,
  requiredTiers: readonly TierName[]
): boolean {
  if (requiredTiers.length === 0) return true
  if (!memberTier) return false
  return requiredTiers.includes(memberTier)
}
