import type { PrecioProducto } from "./queries"

export type EstadoVigencia = "vigente" | "programada" | "finalizada"

/** Se calcula a partir de las fechas en vez de guardarse — evita que quede desincronizado. */
export function estadoVigencia(
  precio: Pick<PrecioProducto, "vigente_desde" | "vigente_hasta">,
  ahora: Date = new Date()
): EstadoVigencia {
  const desde = new Date(precio.vigente_desde)
  const hasta = precio.vigente_hasta ? new Date(precio.vigente_hasta) : null
  if (desde > ahora) return "programada"
  if (hasta && hasta < ahora) return "finalizada"
  return "vigente"
}

/** Diferencia porcentual contra el precio base (fracción, ej. -0.2 = -20%). */
export function deltaVsBase(precio: number, precioBase: number): number | null {
  if (precioBase === 0) return null
  return (precio - precioBase) / precioBase
}
