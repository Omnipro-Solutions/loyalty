"use client"

import { Download } from "lucide-react"

import { STORE_STATUS_LABEL, STORE_FORMAT_LABEL } from "../lib/labels"
import type { Store } from "../lib/queries"

const COLUMNS: { header: string; value: (s: Store) => string }[] = [
  { header: "Tienda", value: (s) => s.nombre },
  { header: "Código", value: (s) => s.codigo_tienda },
  { header: "Ciudad", value: (s) => s.ciudad },
  { header: "Dirección", value: (s) => `${s.direccion}, ${s.colonia}` },
  { header: "Teléfono", value: (s) => s.telefono },
  { header: "Email", value: (s) => s.email },
  {
    header: "Formato",
    value: (s) =>
      STORE_FORMAT_LABEL[s.formato as keyof typeof STORE_FORMAT_LABEL] ??
      s.formato,
  },
  {
    header: "Estado",
    value: (s) =>
      STORE_STATUS_LABEL[s.estado as keyof typeof STORE_STATUS_LABEL] ??
      s.estado,
  },
]

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

type ExportStoresButtonProps = { stores: Store[] }

/** Exporta la página actual de la tabla (04.1 "Exportar") como CSV. */
export function ExportStoresButton({ stores }: ExportStoresButtonProps) {
  function exportCsv() {
    const rows = [
      COLUMNS.map((c) => csvCell(c.header)).join(","),
      ...stores.map((s) => COLUMNS.map((c) => csvCell(c.value(s))).join(",")),
    ]
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "tiendas.csv"
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
