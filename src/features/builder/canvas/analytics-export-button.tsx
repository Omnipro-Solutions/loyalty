"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildCsvRows, downloadCsv, type CsvColumn } from "@/lib/csv"

import type { RunSummary } from "./analytics-queries"

type Step = RunSummary["steps"][number]

const COLUMNS: CsvColumn<Step>[] = [
  { key: "bloque", header: "Bloque", value: (p) => p.label },
  { key: "puerto", header: "Puerto", value: (p) => p.port ?? "" },
  { key: "entrada", header: "Entrada", value: (p) => String(p.entryCount) },
  { key: "salida", header: "Salida", value: (p) => String(p.exitCount) },
]

function exportCsv(run: RunSummary) {
  downloadCsv("analitica-workflow.csv", buildCsvRows(COLUMNS, run.steps))
}

export function AnalyticsExportButton({ run }: { run: RunSummary }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => exportCsv(run)}
    >
      <Download className="size-3.5" />
      Exportar
    </Button>
  )
}
