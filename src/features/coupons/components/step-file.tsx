"use client"

import { useState } from "react"

import { FileUpload } from "@/components/form/file-upload"
import { Message } from "@/components/form/message"
import { Section } from "@/components/form/section"
import { formatNumber } from "@/lib/format"

import {
  inferColumnMapping,
  mapImportRows,
  parseCsv,
  type CouponImportRow,
} from "../lib/csv-import"

type StepFileProps = {
  filename: string | undefined
  rows: CouponImportRow[] | undefined
  error?: string
  onChange: (filename: string, rows: CouponImportRow[]) => void
  onRemove: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** Paso "Archivo" (csv_import): una fila = un cupón; sin coincidencia se emite al portador (doc §3.6). Todo se parsea en el navegador. */
export function StepFile({
  filename,
  rows,
  error,
  onChange,
  onRemove,
}: StepFileProps) {
  const [fileMeta, setFileMeta] = useState<{
    name: string
    size: string
  } | null>(filename ? { name: filename, size: "" } : null)

  async function handleFile(file: File) {
    const text = await file.text()
    const parsed = parseCsv(text)
    const mapping = inferColumnMapping(parsed.headers)
    const rows = mapImportRows(parsed, mapping)
    setFileMeta({ name: file.name, size: formatBytes(file.size) })
    onChange(file.name, rows)
  }

  const matched = rows?.filter((r) => r.email).length ?? 0
  const total = rows?.length ?? 0

  return (
    <Section
      title="Importar CSV"
      description="Una fila = un cupón. Las filas sin email reconocible se emiten al portador."
    >
      <FileUpload
        label="Archivo CSV"
        file={fileMeta}
        onFileSelected={handleFile}
        onRemove={() => {
          setFileMeta(null)
          onRemove()
        }}
        accept=".csv,text/csv"
        hint="CSV con una columna de email"
        className="w-full"
      />

      {error && (
        <Message variant="error" title="Falta el archivo" description={error} />
      )}

      {rows && rows.length > 0 && (
        <>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(total)} filas · {formatNumber(matched)} con email
            reconocible
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Código de socio</th>
                  <th className="px-3 py-2 font-semibold">Código sugerido</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{row.email ?? "—"}</td>
                    <td className="px-3 py-2">{row.memberCode ?? "—"}</td>
                    <td className="px-3 py-2">{row.code ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 5 && (
            <p className="text-[11px] text-muted-foreground">
              y {formatNumber(total - 5)} filas más…
            </p>
          )}
        </>
      )}
    </Section>
  )
}
