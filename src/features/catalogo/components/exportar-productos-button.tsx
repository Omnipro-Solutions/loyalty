"use client"

import { Download } from "lucide-react"

import type { Producto } from "../lib/queries"

const COLUMNAS: { encabezado: string; valor: (p: Producto) => string }[] = [
  { encabezado: "SKU", valor: (p) => p.sku },
  { encabezado: "Producto", valor: (p) => p.nombre },
  {
    encabezado: "Categoría",
    valor: (p) => p.rutas.map((r) => r.nombre).join("; ") || "",
  },
  { encabezado: "Precio", valor: (p) => String(p.precio) },
  { encabezado: "Puntos", valor: (p) => String(p.puntos) },
  { encabezado: "Estado", valor: (p) => p.estado },
]

function celdaCsv(valor: string): string {
  return `"${valor.replaceAll('"', '""')}"`
}

type ExportarProductosButtonProps = { productos: Producto[] }

/** Exporta la página actual de la tabla (03.1 "Exportar") como CSV. */
export function ExportarProductosButton({
  productos,
}: ExportarProductosButtonProps) {
  function exportar() {
    const filas = [
      COLUMNAS.map((c) => celdaCsv(c.encabezado)).join(","),
      ...productos.map((p) =>
        COLUMNAS.map((c) => celdaCsv(c.valor(p))).join(",")
      ),
    ]
    const blob = new Blob([filas.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = "catalogo-productos.csv"
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={exportar}
      className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background py-[9px] pr-3.5 pl-3 text-xs font-medium text-secondary-foreground"
    >
      <Download className="size-3.5" />
      Exportar
    </button>
  )
}
