"use client"

import { Download } from "lucide-react"

import { csvCell, downloadCsv } from "@/lib/csv"

import { PROMOTION_TYPE_LABEL } from "../lib/labels"
import type { Promotion } from "../lib/queries"

const COLUMNS: { header: string; value: (p: Promotion) => string }[] = [
  { header: "Nombre", value: (p) => p.nombre },
  { header: "Código", value: (p) => p.codigo },
  { header: "Tipo", value: (p) => PROMOTION_TYPE_LABEL[p.tipo as never] },
  { header: "Canjes", value: (p) => String(p.canjes) },
  {
    header: "Presupuesto asignado",
    value: (p) => String(p.presupuesto_asignado),
  },
  {
    header: "Presupuesto consumido",
    value: (p) => String(p.presupuesto_consumido),
  },
  { header: "Vigente desde", value: (p) => p.vigente_desde },
  { header: "Vigente hasta", value: (p) => p.vigente_hasta ?? "" },
  { header: "Estado", value: (p) => p.estado_publicacion },
]

type ExportPromotionsButtonProps = { promotions: Promotion[] }

/** Exporta la página actual de la tabla (06.1 "Exportar") como CSV. */
export function ExportPromotionsButton({
  promotions,
}: ExportPromotionsButtonProps) {
  function handleExport() {
    downloadCsv("promociones.csv", [
      COLUMNS.map((c) => csvCell(c.header)),
      ...promotions.map((p) => COLUMNS.map((c) => csvCell(c.value(p)))),
    ])
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background py-[9px] pr-3.5 pl-3 text-xs font-medium text-secondary-foreground"
    >
      <Download className="size-3.5" />
      Exportar
    </button>
  )
}
