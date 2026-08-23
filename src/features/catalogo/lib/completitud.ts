import type { Database } from "@/types/database.types"

/**
 * Campos rastreados para "completitud de datos" (03.1 columna COMPLETITUD /
 * 03.3 "9 de 11 campos"). `imagen_url` queda fuera a propósito: un catálogo
 * de demo sin fotografía real no debería taparse en "incompleto" por eso.
 * La clasificación (categorías, `producto_categorias`) vive en otra tabla —
 * se pasa como `tieneClasificacion` en vez de leerse de una columna, para
 * que esta función siga siendo pura (sin ir a la base de datos).
 */
const CAMPOS_COMPLETITUD = [
  "codigo_barras",
  "marca",
  "proveedor",
  "presentacion",
  "tipo_producto",
] as const

type ProductoParaCompletitud = Pick<
  Database["public"]["Tables"]["productos"]["Row"],
  (typeof CAMPOS_COMPLETITUD)[number]
> & {
  tieneClasificacion: boolean
}

export type Completitud = {
  llenos: number
  total: number
  porcentaje: number
}

export function calcularCompletitud(
  producto: ProductoParaCompletitud
): Completitud {
  const total = CAMPOS_COMPLETITUD.length + 1
  const llenosCampos = CAMPOS_COMPLETITUD.filter((campo) => {
    const valor = producto[campo]
    return valor !== null && valor !== undefined && valor !== ""
  }).length
  const llenos = llenosCampos + (producto.tieneClasificacion ? 1 : 0)
  return { llenos, total, porcentaje: llenos / total }
}

export type BandaCompletitud = "success" | "warning" | "destructive"

/** Umbrales de la "Salud del inventario" (626:331): 90–100 / 70–90 / <70. */
export function bandaCompletitud(porcentaje: number): BandaCompletitud {
  if (porcentaje >= 0.9) return "success"
  if (porcentaje >= 0.7) return "warning"
  return "destructive"
}
