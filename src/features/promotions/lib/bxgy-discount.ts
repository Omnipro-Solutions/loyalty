/**
 * Evaluador puro de `por_piezas` (BxGy — "compra N, paga M",
 * docs/promociones.md §7.2), versión transaccional: se evalúa contra un
 * solo carrito. Sin I/O, mismo espíritu que `tiered-discount.ts`.
 */

export type BxgyConfig = {
  compraCantidad: number
  pagaCantidad: number
  /** Porcentaje de descuento sobre cada unidad "extra" (100 = gratis). */
  descuentoUnidadExtraPct: number
}

/** Un solo carrito — versión transaccional. */
export type BxgyCart = {
  /** Unidades del universo que califican (mismo producto/categoría/producto específico, según `alcancePiezas`). */
  units: number
  /** Monto que corresponde a esas unidades. */
  amount: number
}

export type BxgyResult = {
  /** Cuántas veces se completó el patrón "compra N" dentro del carrito. */
  sets: number
  /** Unidades que reciben el descuento (sets * (compraCantidad - pagaCantidad)). */
  discountedUnits: number
  discount: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function computeBxgyDiscount(
  config: BxgyConfig,
  cart: BxgyCart
): BxgyResult {
  const units = Number.isFinite(cart.units) && cart.units > 0 ? cart.units : 0
  const amount =
    Number.isFinite(cart.amount) && cart.amount > 0 ? cart.amount : 0
  const compra =
    Number.isFinite(config.compraCantidad) && config.compraCantidad > 0
      ? Math.floor(config.compraCantidad)
      : 0
  const paga =
    Number.isFinite(config.pagaCantidad) && config.pagaCantidad > 0
      ? Math.floor(config.pagaCantidad)
      : 0
  const pct = Number.isFinite(config.descuentoUnidadExtraPct)
    ? Math.min(100, Math.max(0, config.descuentoUnidadExtraPct))
    : 0

  // Sin "compra N" válido, o "paga M" no menor a "compra N", no hay patrón
  // que completar — mismo caso borde que un formulario mal configurado.
  if (compra <= 0 || paga >= compra || units <= 0) {
    return { sets: 0, discountedUnits: 0, discount: 0 }
  }

  // Un múltiplo parcial no da descuento parcial — igual que un 3x2 real:
  // con 5 piezas y compra=3, solo se completó 1 set (floor(5/3)=1), las
  // otras 2 no acumulan hacia un segundo set.
  const sets = Math.floor(units / compra)
  const discountedUnits = sets * (compra - paga)
  if (discountedUnits <= 0) {
    return { sets, discountedUnits: 0, discount: 0 }
  }

  // Sin líneas de carrito reales en esta versión transaccional simple, se
  // usa el precio promedio de las unidades del universo — un motor con
  // líneas de carrito discriminaría exactamente qué unidades caen gratis
  // (mismo criterio que ya documenta `tiered-discount.ts` para su modo
  // progresivo).
  const avgUnitPrice = units > 0 ? amount / units : 0
  const discount = round2(discountedUnits * avgUnitPrice * (pct / 100))

  return { sets, discountedUnits, discount }
}
