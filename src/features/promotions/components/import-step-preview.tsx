"use client"

import { Message } from "@/components/form/message"
import { Section } from "@/components/form/section"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

import { ImportFailuresTable } from "./import-failures-table"
import type { ImportFailure, ImportReadyRow } from "../lib/promotion-import"

type ImportStepPreviewProps = {
  ready: ImportReadyRow[]
  failures: ImportFailure[]
  isPending: boolean
  errorMessage?: string
  onImport: () => void
}

/** Paso "Validación": cuenta listas/con error y deja importar solo las que sí pasaron — la importación parcial es la decisión del producto, no una limitación técnica. */
export function ImportStepPreview({
  ready,
  failures,
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
      <p className="text-[13px] text-muted-foreground">
        {formatNumber(total)} filas ·{" "}
        <span className="font-medium text-success">
          {formatNumber(ready.length)} listas
        </span>
        {failures.length > 0 && (
          <>
            {" · "}
            <span className="font-medium text-destructive">
              {formatNumber(failures.length)} con error
            </span>
          </>
        )}
      </p>

      {errorMessage && (
        <Message
          variant="error"
          title="No se pudo importar"
          description={errorMessage}
        />
      )}

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
