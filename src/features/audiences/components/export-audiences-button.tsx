"use client"

import { Download } from "lucide-react"

import { SEGMENT_STATUS_LABEL, TIER_LABEL } from "../lib/labels"
import type { AudienceListItem } from "../lib/queries"

const COLUMNS: {
  header: string
  value: (a: AudienceListItem) => string
}[] = [
  { header: "Nombre", value: (a) => a.name },
  { header: "Código", value: (a) => a.code },
  {
    header: "Nivel dominante",
    value: (a) => (a.dominantTier ? TIER_LABEL[a.dominantTier] : ""),
  },
  { header: "Tamaño", value: (a) => String(a.size) },
  {
    header: "Loyalty rules vinculadas",
    value: (a) => String(a.linkedJourneys),
  },
  { header: "Estado", value: (a) => SEGMENT_STATUS_LABEL[a.status] },
  {
    header: "Sincronizada con AJO",
    value: (a) => (a.syncedWithAjo ? "Sí" : "No"),
  },
]

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

type ExportAudiencesButtonProps = { audiences: AudienceListItem[] }

/** Exporta la página actual de la tabla (11.1 "Exportar") como CSV — mismo patrón que `ExportPromotionsButton`. */
export function ExportAudiencesButton({
  audiences,
}: ExportAudiencesButtonProps) {
  function exportCsv() {
    const rows = [
      COLUMNS.map((c) => csvCell(c.header)).join(","),
      ...audiences.map((a) =>
        COLUMNS.map((c) => csvCell(c.value(a))).join(",")
      ),
    ]
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "audiencias.csv"
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
