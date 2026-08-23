"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { RunResumen } from "./analytics-queries"

function exportarCsv(corrida: RunResumen) {
  const encabezado = ["Bloque", "Puerto", "Entrada", "Salida"]
  const filas = corrida.pasos.map((p) => [
    p.etiqueta,
    p.port ?? "",
    String(p.conteoEntrada),
    String(p.conteoSalida),
  ])
  const csv = [encabezado, ...filas]
    .map((fila) => fila.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "analitica-workflow.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function AnaliticaExportButton({ corrida }: { corrida: RunResumen }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => exportarCsv(corrida)}
    >
      <Download className="size-3.5" />
      Exportar
    </Button>
  )
}
