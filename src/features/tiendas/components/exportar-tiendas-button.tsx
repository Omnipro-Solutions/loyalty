"use client"

import { Download } from "lucide-react"

import { TIENDA_ESTADO_LABEL, TIENDA_FORMATO_LABEL } from "../lib/labels"
import type { Tienda } from "../lib/queries"

const COLUMNAS: { encabezado: string; valor: (t: Tienda) => string }[] = [
  { encabezado: "Tienda", valor: (t) => t.nombre },
  { encabezado: "Código", valor: (t) => t.codigo_tienda },
  { encabezado: "Ciudad", valor: (t) => t.ciudad },
  { encabezado: "Dirección", valor: (t) => `${t.direccion}, ${t.colonia}` },
  { encabezado: "Teléfono", valor: (t) => t.telefono },
  { encabezado: "Email", valor: (t) => t.email },
  {
    encabezado: "Formato",
    valor: (t) =>
      TIENDA_FORMATO_LABEL[t.formato as keyof typeof TIENDA_FORMATO_LABEL] ??
      t.formato,
  },
  {
    encabezado: "Estado",
    valor: (t) =>
      TIENDA_ESTADO_LABEL[t.estado as keyof typeof TIENDA_ESTADO_LABEL] ??
      t.estado,
  },
]

function celdaCsv(valor: string): string {
  return `"${valor.replaceAll('"', '""')}"`
}

type ExportarTiendasButtonProps = { tiendas: Tienda[] }

/** Exporta la página actual de la tabla (04.1 "Exportar") como CSV. */
export function ExportarTiendasButton({ tiendas }: ExportarTiendasButtonProps) {
  function exportar() {
    const filas = [
      COLUMNAS.map((c) => celdaCsv(c.encabezado)).join(","),
      ...tiendas.map((t) =>
        COLUMNAS.map((c) => celdaCsv(c.valor(t))).join(",")
      ),
    ]
    const blob = new Blob([filas.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = "tiendas.csv"
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
