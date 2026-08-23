"use client"

import { Download } from "lucide-react"

import { TIPO_PROMOCION_LABEL } from "../lib/labels"
import type { Promocion } from "../lib/queries"

const COLUMNAS: { encabezado: string; valor: (p: Promocion) => string }[] = [
  { encabezado: "Nombre", valor: (p) => p.nombre },
  { encabezado: "Código", valor: (p) => p.codigo },
  { encabezado: "Tipo", valor: (p) => TIPO_PROMOCION_LABEL[p.tipo as never] },
  { encabezado: "Canjes", valor: (p) => String(p.canjes) },
  {
    encabezado: "Presupuesto asignado",
    valor: (p) => String(p.presupuesto_asignado),
  },
  {
    encabezado: "Presupuesto consumido",
    valor: (p) => String(p.presupuesto_consumido),
  },
  { encabezado: "Vigente desde", valor: (p) => p.vigente_desde },
  { encabezado: "Vigente hasta", valor: (p) => p.vigente_hasta ?? "" },
  { encabezado: "Estado", valor: (p) => p.estado_publicacion },
]

function celdaCsv(valor: string): string {
  return `"${valor.replaceAll('"', '""')}"`
}

type ExportarPromocionesButtonProps = { promociones: Promocion[] }

/** Exporta la página actual de la tabla (06.1 "Exportar") como CSV. */
export function ExportarPromocionesButton({
  promociones,
}: ExportarPromocionesButtonProps) {
  function exportar() {
    const filas = [
      COLUMNAS.map((c) => celdaCsv(c.encabezado)).join(","),
      ...promociones.map((p) =>
        COLUMNAS.map((c) => celdaCsv(c.valor(p))).join(",")
      ),
    ]
    const blob = new Blob([filas.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = "promociones.csv"
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
