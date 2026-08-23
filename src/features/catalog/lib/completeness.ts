import type { Database } from "@/types/database.types"

/**
 * Campos rastreados para "completitud de datos" (03.1 columna COMPLETITUD /
 * 03.3 "9 de 11 campos"). `imagen_url` queda fuera a propósito: un catálogo
 * de demo sin fotografía real no debería taparse en "incompleto" por eso.
 * La clasificación (categorías, `producto_categorias`) vive en otra tabla —
 * se pasa como `hasClassification` en vez de leerse de una columna, para
 * que esta función siga siendo pura (sin ir a la base de datos).
 */
const COMPLETENESS_FIELDS = [
  "codigo_barras",
  "marca",
  "proveedor",
  "presentacion",
  "tipo_producto",
] as const

type ProductForCompleteness = Pick<
  Database["public"]["Tables"]["productos"]["Row"],
  (typeof COMPLETENESS_FIELDS)[number]
> & {
  hasClassification: boolean
}

export type Completeness = {
  filled: number
  total: number
  percentage: number
}

export function calculateCompleteness(
  product: ProductForCompleteness
): Completeness {
  const total = COMPLETENESS_FIELDS.length + 1
  const filledFields = COMPLETENESS_FIELDS.filter((field) => {
    const value = product[field]
    return value !== null && value !== undefined && value !== ""
  }).length
  const filled = filledFields + (product.hasClassification ? 1 : 0)
  return { filled, total, percentage: filled / total }
}

export type CompletenessBand = "success" | "warning" | "destructive"

/** Umbrales de la "Salud del inventario" (626:331): 90–100 / 70–90 / <70. */
export function completenessBand(percentage: number): CompletenessBand {
  if (percentage >= 0.9) return "success"
  if (percentage >= 0.7) return "warning"
  return "destructive"
}
