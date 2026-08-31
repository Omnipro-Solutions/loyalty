import type { CsvColumn } from "@/lib/csv"

import type { Product } from "./queries"

export const PRODUCTS_EXPORT_FILENAME = "catalogo-productos.csv"

/** `{key, label}` sin las funciones `value` — lo que `ExportProductsButton`
 *  (cliente) importa para el checklist de columnas del diálogo de export. */
export const PRODUCTS_EXPORT_COLUMN_OPTIONS = [
  { key: "sku", label: "SKU" },
  { key: "producto", label: "Producto" },
  { key: "categoria", label: "Categoría" },
  { key: "precio", label: "Precio" },
  { key: "puntos", label: "Puntos" },
  { key: "estado", label: "Estado" },
  { key: "receta", label: "Receta" },
] as const

/** Server-only — solo la action de export lo importa. */
export const PRODUCTS_EXPORT_COLUMNS: CsvColumn<Product>[] = [
  { key: "sku", header: "SKU", value: (p) => p.sku },
  { key: "producto", header: "Producto", value: (p) => p.nombre },
  {
    key: "categoria",
    header: "Categoría",
    value: (p) => p.paths.map((r) => r.name).join("; ") || "",
  },
  { key: "precio", header: "Precio", value: (p) => String(p.precio) },
  { key: "puntos", header: "Puntos", value: (p) => String(p.puntos) },
  { key: "estado", header: "Estado", value: (p) => p.estado },
  {
    key: "receta",
    header: "Receta",
    value: (p) => (p.requiere_receta ? "RX" : "OTC"),
  },
]
