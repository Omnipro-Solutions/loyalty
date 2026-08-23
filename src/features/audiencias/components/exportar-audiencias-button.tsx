"use client"

import { Download } from "lucide-react"

import { SEGMENT_ESTADO_LABEL, TIER_LABEL } from "../lib/labels"
import type { AudienciaListItem } from "../lib/queries"

const COLUMNAS: {
  encabezado: string
  valor: (a: AudienciaListItem) => string
}[] = [
  { encabezado: "Nombre", valor: (a) => a.nombre },
  { encabezado: "Código", valor: (a) => a.codigo },
  {
    encabezado: "Nivel dominante",
    valor: (a) => (a.nivelDominante ? TIER_LABEL[a.nivelDominante] : ""),
  },
  { encabezado: "Tamaño", valor: (a) => String(a.tamano) },
  {
    encabezado: "Loyalty rules vinculadas",
    valor: (a) => String(a.journeysVinculados),
  },
  { encabezado: "Estado", valor: (a) => SEGMENT_ESTADO_LABEL[a.estado] },
  {
    encabezado: "Sincronizada con AJO",
    valor: (a) => (a.sincronizadoConAjo ? "Sí" : "No"),
  },
]

function celdaCsv(valor: string): string {
  return `"${valor.replaceAll('"', '""')}"`
}

type ExportarAudienciasButtonProps = { audiencias: AudienciaListItem[] }

/** Exporta la página actual de la tabla (11.1 "Exportar") como CSV — mismo patrón que `ExportarPromocionesButton`. */
export function ExportarAudienciasButton({
  audiencias,
}: ExportarAudienciasButtonProps) {
  function exportar() {
    const filas = [
      COLUMNAS.map((c) => celdaCsv(c.encabezado)).join(","),
      ...audiencias.map((a) =>
        COLUMNAS.map((c) => celdaCsv(c.valor(a))).join(",")
      ),
    ]
    const blob = new Blob([filas.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = "audiencias.csv"
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
