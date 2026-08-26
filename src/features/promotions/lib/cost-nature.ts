import type { BenefitType, CostNature } from "@/types/domain"

/**
 * Naturaleza de costo sugerida por mecánica (docs/modalidades-promocion-
 * contexto.md, tabla de reconocimiento por modalidad, líneas 2430-2454) —
 * el paso "Economía" precarga esto y el operador confirma o cambia, no
 * rellena desde cero. Mapeo por mecánica REAL de este proyecto (no 1:1 con
 * las 23 modalidades del documento):
 *
 * - Las 3 mecánicas de descuento variable + bundle → margen sacrificado
 *   (menor ingreso, nunca gasto de marketing).
 * - `producto_gratis`/`por_piezas` entregan una pieza física → costo de
 *   producto (a costo de adquisición, no a precio de venta).
 * - `envio_gratis` no toca el margen del producto → costo de servicio.
 * - Las 2 mecánicas de puntos generan una obligación de desempeño futura
 *   (NIIF 15) → ingreso diferido.
 * - `emitir_cupon` por defecto se trata como descuento futuro (margen
 *   sacrificado) — el operador lo cambia a "ingreso diferido" si el cupón
 *   se financia contra saldo de puntos en vez de precio.
 * - `precio_especial` (T03) es margen sacrificado, igual que un descuento
 *   directo. `cashback` (T13) es el único con pasivo en efectivo real
 *   (saldo del monedero, exigible en dinero).
 * - `descuento_continuidad` es margen sacrificado, igual que los otros 3
 *   descuentos variables — misma cuenta contable que T18 "Adherencia a
 *   tratamiento" (docs/modalidades-promocion-contexto.md:2449).
 */
export const COST_NATURE_BY_MECHANIC: Record<BenefitType, CostNature> = {
  descuento_porcentual: "margen_sacrificado",
  descuento_monto_fijo: "margen_sacrificado",
  descuento_escalonado: "margen_sacrificado",
  precio_fijo_bundle: "margen_sacrificado",
  envio_gratis: "costo_servicio",
  producto_gratis: "costo_producto",
  por_piezas: "costo_producto",
  multiplicador_puntos: "ingreso_diferido",
  bono_puntos: "ingreso_diferido",
  emitir_cupon: "margen_sacrificado",
  precio_especial: "margen_sacrificado",
  cashback: "saldo_efectivo",
  descuento_continuidad: "margen_sacrificado",
}

export function suggestedCostNature(benefitType: BenefitType): CostNature {
  return COST_NATURE_BY_MECHANIC[benefitType]
}
