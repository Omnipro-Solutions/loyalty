"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadCsv } from "@/lib/csv"

import { buildFailuresCsv, type ImportFailure } from "../lib/promotion-import"

type ImportFailuresTableProps = { failures: ImportFailure[] }

/** Tabla de filas con error, compartida por el paso de Validación y el de Resultado — mismo idioma visual que `features/coupons/components/step-file.tsx`. El CSV descargado trae las 16 columnas originales más `fila`/`columna`/`motivo`, así que es el mismo archivo que se corrige y se vuelve a subir. */
export function ImportFailuresTable({ failures }: ImportFailuresTableProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-foreground">
          Filas con error
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "errores-importacion-promociones.csv",
              buildFailuresCsv(failures)
            )
          }
        >
          <Download className="size-3.5" />
          Descargar errores
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Fila</th>
              <th className="px-3 py-2 font-semibold">Código</th>
              <th className="px-3 py-2 font-semibold">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((f) => (
              <tr key={f.rowNumber} className="border-t border-border">
                <td className="px-3 py-2">{f.rowNumber}</td>
                <td className="px-3 py-2">{f.row.codigo || "—"}</td>
                <td className="px-3 py-2 text-destructive">
                  {f.errors.map((e) => e.message).join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
