"use client"

import { Message } from "@/components/form/message"
import { Section } from "@/components/form/section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

import { ImportColumnReport } from "./import-column-report"
import { ImportFailuresTable } from "./import-failures-table"
import type {
  ImportFailure,
  ImportReadyRow,
  ImportReport,
} from "../lib/promotion-import"

type ImportStepPreviewProps = {
  ready: ImportReadyRow[]
  failures: ImportFailure[]
  /** Informe por columna — qué campos pasaron y en qué líneas falló cada uno. */
  report: ImportReport
  isPending: boolean
  errorMessage?: string
  onImport: () => void
}

/** Paso "Validación": cuenta listas/con error y deja importar solo las que sí pasaron — la importación parcial es la decisión del producto, no una limitación técnica. */
export function ImportStepPreview({
  ready,
  failures,
  report,
  isPending,
  errorMessage,
  onImport,
}: ImportStepPreviewProps) {
  const total = ready.length + failures.length

  return (
    <Section
      title="Validación y previsualización"
      description="Se importarán solo las filas listas — corrige y vuelve a subir las que tengan error."
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{formatNumber(total)} filas</Badge>
        <Badge variant="success">
          {formatNumber(ready.length)} pasan la validación
        </Badge>
        {failures.length > 0 && (
          <Badge variant="error">
            {formatNumber(failures.length)} con error
          </Badge>
        )}
        {report.missingRequired.length === 0 ? (
          <Badge variant="success">Campos obligatorios completos</Badge>
        ) : (
          <Badge variant="error">
            Faltan {report.missingRequired.length} campos obligatorios
          </Badge>
        )}
      </div>

      {report.missingRequired.length > 0 && (
        <Message
          variant="error"
          title="El archivo no trae todas las columnas obligatorias"
          description={`Falta: ${report.missingRequired.join(", ")}. Vuelve al paso "Mapeo de columnas" para asignarlas.`}
        />
      )}

      {errorMessage && (
        <Message
          variant="error"
          title="No se pudo importar"
          description={errorMessage}
        />
      )}

      <ImportColumnReport report={report} />

      {failures.length > 0 && <ImportFailuresTable failures={failures} />}

      <div className="flex items-center justify-end">
        <Button
          type="button"
          onClick={onImport}
          disabled={ready.length === 0 || isPending}
        >
          {isPending
            ? "Importando…"
            : `Importar ${formatNumber(ready.length)} promoci${ready.length === 1 ? "ón" : "ones"}`}
        </Button>
      </div>
    </Section>
  )
}
