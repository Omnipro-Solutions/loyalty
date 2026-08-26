"use client"

import { Download } from "lucide-react"

import { csvCell, downloadCsv } from "@/lib/csv"

import type { Product } from "../lib/queries"

const COLUMNS: { header: string; value: (p: Product) => string }[] = [
  { header: "SKU", value: (p) => p.sku },
  { header: "Producto", value: (p) => p.nombre },
  {
    header: "Categoría",
    value: (p) => p.paths.map((r) => r.name).join("; ") || "",
  },
  { header: "Precio", value: (p) => String(p.precio) },
  { header: "Puntos", value: (p) => String(p.puntos) },
  { header: "Estado", value: (p) => p.estado },
  { header: "Receta", value: (p) => (p.requiere_receta ? "RX" : "OTC") },
]

type ExportProductsButtonProps = { products: Product[] }

/** Exporta la página actual de la tabla (03.1 "Exportar") como CSV. */
export function ExportProductsButton({ products }: ExportProductsButtonProps) {
  function exportCsv() {
    downloadCsv("catalogo-productos.csv", [
      COLUMNS.map((c) => csvCell(c.header)),
      ...products.map((p) => COLUMNS.map((c) => csvCell(c.value(p)))),
    ])
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background py-[9px] pr-3.5 pl-3 text-xs font-medium text-secondary-foreground"
    >
      <Download className="size-3.5" />
      Exportar
    </button>
  )
}
