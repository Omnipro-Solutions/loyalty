"use client"

import { Download } from "lucide-react"
import { useState } from "react"

import { FileUpload } from "@/components/form/file-upload"
import { Message } from "@/components/form/message"
import { Section } from "@/components/form/section"
import { Button } from "@/components/ui/button"
import { csvCell, downloadCsv, parseCsv, type ParsedCsv } from "@/lib/csv"
import { formatNumber } from "@/lib/format"

import { MAX_IMPORT_ROWS, buildTemplateCsv } from "../lib/promotion-import"

type ImportStepFileProps = {
  file: { name: string; size: string } | null
  onFileParsed: (name: string, size: string, parsed: ParsedCsv) => void
  onRemove: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/** Paso "Archivo": una fila = una promoción. Todo se parsea en el navegador — no hay bucket de Storage en este proyecto, mismo motivo que `features/coupons/lib/csv-import.ts`. */
export function ImportStepFile({
  file,
  onFileParsed,
  onRemove,
}: ImportStepFileProps) {
  const [error, setError] = useState<string>()

  async function handleFile(f: File) {
    const text = await f.text()
    const parsed = parseCsv(text)
    if (parsed.rows.length === 0) {
      setError("El archivo no tiene filas de datos.")
      return
    }
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      setError(
        `El archivo tiene ${formatNumber(parsed.rows.length)} filas — el máximo por importación es ${MAX_IMPORT_ROWS}.`
      )
      return
    }
    setError(undefined)
    onFileParsed(f.name, formatBytes(f.size), parsed)
  }

  return (
    <Section
      title="Archivo"
      description="Una fila = una promoción. Descarga la plantilla si no tienes un archivo listo."
      action={
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            downloadCsv(
              "plantilla-promociones.csv",
              buildTemplateCsv().map((row) => row.map(csvCell))
            )
          }
        >
          <Download className="size-4" />
          Descargar plantilla
        </Button>
      }
    >
      <FileUpload
        label="Archivo CSV"
        file={file}
        onFileSelected={handleFile}
        onRemove={onRemove}
        accept=".csv,text/csv"
        hint={`CSV · una fila = una promoción · máx. ${MAX_IMPORT_ROWS} filas`}
        className="w-full"
      />

      {error && (
        <Message
          variant="error"
          title="No se pudo leer el archivo"
          description={error}
        />
      )}
    </Section>
  )
}
