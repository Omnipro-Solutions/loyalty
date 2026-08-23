import type { ProductPrice } from "./queries"

export type ValidityStatus = "vigente" | "programada" | "finalizada"

/** Se calcula a partir de las fechas en vez de guardarse — evita que quede desincronizado. */
export function validityStatus(
  price: Pick<ProductPrice, "vigente_desde" | "vigente_hasta">,
  now: Date = new Date()
): ValidityStatus {
  const from = new Date(price.vigente_desde)
  const to = price.vigente_hasta ? new Date(price.vigente_hasta) : null
  if (from > now) return "programada"
  if (to && to < now) return "finalizada"
  return "vigente"
}

/** Diferencia porcentual contra el precio base (fracción, ej. -0.2 = -20%). */
export function deltaVsBase(price: number, basePrice: number): number | null {
  if (basePrice === 0) return null
  return (price - basePrice) / basePrice
}
