"use client"

import Link from "next/link"

import { Message } from "@/components/form/message"
import { Section } from "@/components/form/section"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/format"

import { ImportFailuresTable } from "./import-failures-table"
import type { ImportPromotionsResult } from "../actions/import-promotions"

type ImportStepResultProps = {
  result: ImportPromotionsResult
  onReset: () => void
}

/** Paso "Resultado": creadas vs fallidas, con la misma tabla+descarga de errores del paso anterior. */
export function ImportStepResult({ result, onReset }: ImportStepResultProps) {
  if (!result.ok) {
    return (
      <Section title="Resultado">
        <Message
          variant="error"
          title="No se pudo importar"
          description={result.message}
        />
        <Button type="button" variant="outline" onClick={onReset}>
          Intentar de nuevo
        </Button>
      </Section>
    )
  }

  return (
    <Section
      title="Resultado"
      description={`${formatNumber(result.created)} promoci${result.created === 1 ? "ón creada" : "ones creadas"} como borrador${result.failed.length > 0 ? ` · ${formatNumber(result.failed.length)} filas con error` : ""}.`}
    >
      {result.created > 0 && (
        <Message
          variant="success"
          title="Importación completada"
          description={`${formatNumber(result.created)} promoci${result.created === 1 ? "ón quedó" : "ones quedaron"} guardadas como borrador — revísalas y actívalas desde el listado.`}
        />
      )}

      {result.failed.length > 0 && (
        <ImportFailuresTable failures={result.failed} />
      )}

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={onReset}>
          Importar otro archivo
        </Button>
        <Button nativeButton={false} render={<Link href="/promociones" />}>
          Ver promociones
        </Button>
      </div>
    </Section>
  )
}
