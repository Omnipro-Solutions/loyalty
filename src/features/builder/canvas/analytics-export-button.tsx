"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { RunSummary } from "./analytics-queries"

function exportCsv(run: RunSummary) {
  const header = ["Bloque", "Puerto", "Entrada", "Salida"]
  const rows = run.steps.map((p) => [
    p.label,
    p.port ?? "",
    String(p.entryCount),
    String(p.exitCount),
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "analitica-workflow.csv"
  a.click()
  URL.revokeObjectURL(url)
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
