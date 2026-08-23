"use client"

import { Download } from "lucide-react"

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
]

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

type ExportProductsButtonProps = { products: Product[] }

/** Exporta la página actual de la tabla (03.1 "Exportar") como CSV. */
export function ExportProductsButton({ products }: ExportProductsButtonProps) {
  function exportCsv() {
    const rows = [
      COLUMNS.map((c) => csvCell(c.header)).join(","),
      ...products.map((p) => COLUMNS.map((c) => csvCell(c.value(p))).join(",")),
    ]
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "catalogo-productos.csv"
    link.click()
    URL.revokeObjectURL(url)
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
