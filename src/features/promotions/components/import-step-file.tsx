"use client"

import { Download } from "lucide-react"
import { useState } from "react"

import { Field } from "@/components/form/field"
import { FileUpload } from "@/components/form/file-upload"
import { Message } from "@/components/form/message"
import { OptionPicker } from "@/components/form/option-picker"
import { Section } from "@/components/form/section"
import { Button } from "@/components/ui/button"
import { csvCell, downloadCsv, parseCsv, type ParsedCsv } from "@/lib/csv"
import { formatBytes, formatNumber } from "@/lib/format"

import { BENEFIT_TYPE_LABEL } from "../lib/labels"
import {
  MAX_IMPORT_ROWS,
  IMPORTABLE_BENEFIT_TYPES,
  buildMechanicTemplate,
  buildTemplateCsv,
  type ImportableBenefitType,
  type TemplateSamples,
} from "../lib/promotion-import"

type ImportStepFileProps = {
  file: { name: string; size: string } | null
  onFileParsed: (name: string, size: string, parsed: ParsedCsv) => void
  onRemove: () => void
  templateSamples: TemplateSamples
  today: string
}

/** Paso "Archivo": una fila = una promoción. Todo se parsea en el navegador — no hay bucket de Storage en este proyecto, mismo motivo que `features/coupons/lib/csv-import.ts`. */
export function ImportStepFile({
  file,
  onFileParsed,
  onRemove,
  templateSamples,
  today,
}: ImportStepFileProps) {
  const [error, setError] = useState<string>()
  const [templateMechanic, setTemplateMechanic] =
    useState<ImportableBenefitType>("descuento_porcentual")

  const template = buildMechanicTemplate(
    templateMechanic,
    templateSamples,
    today
  )

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
      description="Una fila = una promoción. Descarga la plantilla de la mecánica que vas a cargar si no tienes un archivo listo."
    >
      {/*
        Una plantilla POR MECÁNICA, no una sola con las 31 columnas del
        contrato: cada mecánica pide campos distintos, y un CSV con 25
        columnas vacías es imposible de rellenar sin adivinar. El ejemplo se
        arma con categorías y SKUs reales del tenant, así que importa tal
        cual — es el mismo contrato que valida el paso "Validación".
      */}
      <div className="flex w-full flex-col gap-3 rounded-[10px] border border-dashed border-border px-3.5 py-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13px] leading-[18px] font-medium text-foreground">
            Plantilla de ejemplo por mecánica
          </p>
          <p className="text-[11px] leading-4 text-muted-foreground">
            {template.columns.length} columnas · rellenada con datos reales de
            tu catálogo.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <Field
            label="Mecánica"
            htmlFor="templateMechanic"
            className="w-[280px]"
          >
            <OptionPicker
              id="templateMechanic"
              title="Mecánica de la plantilla"
              description="Cada mecánica genera su propio formato de columnas."
              confirmLabel="Elegir mecánica"
              options={IMPORTABLE_BENEFIT_TYPES.map((benefitType) => ({
                value: benefitType,
                label: BENEFIT_TYPE_LABEL[benefitType],
              }))}
              value={templateMechanic}
              onValueChange={(v) =>
                setTemplateMechanic(v as ImportableBenefitType)
              }
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadCsv(
                `plantilla-${templateMechanic.replace(/_/g, "-")}.csv`,
                template.csv.map((row) => row.map(csvCell))
              )
            }
          >
            <Download className="size-4" />
            Descargar plantilla
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              downloadCsv(
                "plantilla-promociones-completa.csv",
                buildTemplateCsv().map((row) => row.map(csvCell))
              )
            }
          >
            Contrato completo
          </Button>
        </div>
      </div>

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
