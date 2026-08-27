"use client"

import { useAction } from "next-safe-action/hooks"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import type { ParsedCsv } from "@/lib/csv"

import { importPromotionsAction } from "../actions/import-promotions"
import {
  buildImportCatalogs,
  buildImportReport,
  inferImportMapping,
  mapImportRows,
  missingRequiredColumns,
  validateImportBatch,
  type ColumnMapping,
  type ImportCouponBatchRef,
  type ImportProductRef,
} from "../lib/promotion-import"
import type {
  ConditionCategory,
  ConditionCity,
  ConditionSegment,
  ConditionTier,
  SupplierOption,
} from "../lib/queries"
import { ImportStepFile } from "./import-step-file"
import { ImportStepMapping } from "./import-step-mapping"
import { ImportStepPreview } from "./import-step-preview"
import { ImportStepResult } from "./import-step-result"
import { PromotionStepper } from "./promotion-stepper"

const STEPS = [
  "Archivo",
  "Mapeo de columnas",
  "Validación",
  "Resultado",
] as const

type PromotionImportFormProps = {
  categories: ConditionCategory[]
  segments: ConditionSegment[]
  cities: ConditionCity[]
  products: ImportProductRef[]
  couponBatches: ImportCouponBatchRef[]
  tiers: ConditionTier[]
  suppliers: SupplierOption[]
  /** Fecha del servidor (AAAA-MM-DD) para las plantillas — el cliente no la calcula, así el CSV es igual para todos. */
  today: string
}

/**
 * Wizard de 4 pasos, estado con `useState` (no react-hook-form): no hay
 * campos de formulario que registrar — la unidad de validación es una fila
 * del archivo, no un campo, y RHF no tiene nada útil que aportar aquí. Cada
 * paso vive en su propio componente (`Import*`), este orquesta el estado y
 * qué paso se muestra.
 */
export function PromotionImportForm({
  categories,
  segments,
  cities,
  products,
  couponBatches,
  tiers,
  suppliers,
  today,
}: PromotionImportFormProps) {
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [file, setFile] = useState<{ name: string; size: string } | null>(null)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})

  const catalogs = useMemo(
    () =>
      buildImportCatalogs(categories, segments, cities, products, {
        couponBatches,
        tiers,
        suppliers,
      }),
    [categories, segments, cities, products, couponBatches, tiers, suppliers]
  )

  /** Datos reales con los que se rellenan las plantillas de ejemplo, para que importen sin editarlas. */
  const templateSamples = useMemo(
    () => ({
      categories: categories.map((c) => c.name),
      productSkus: products.map((p) => p.sku),
      segment: segments[0]?.name,
      city: cities[0]?.city,
      couponBatch: couponBatches[0]?.reference,
    }),
    [categories, products, segments, cities, couponBatches]
  )

  const rawRows = useMemo(
    () => (parsed ? mapImportRows(parsed, mapping) : []),
    [parsed, mapping]
  )
  const validation = useMemo(
    () => validateImportBatch(rawRows, catalogs),
    [rawRows, catalogs]
  )
  /** Informe por columna del paso "Validación" — se deriva de `validation`, no revalida nada. */
  const report = useMemo(
    () => buildImportReport(rawRows, mapping, validation),
    [rawRows, mapping, validation]
  )

  const importAction = useAction(importPromotionsAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setFurthest(3)
        setStep(3)
      }
    },
  })

  const importError = importAction.result.serverError
    ? "No se pudo importar el archivo — intenta de nuevo."
    : importAction.result.data?.ok === false
      ? importAction.result.data.message
      : undefined

  function goToStep(target: number) {
    setStep(Math.min(target, furthest))
  }

  function handleFileParsed(name: string, size: string, csv: ParsedCsv) {
    setFile({ name, size })
    setParsed(csv)
    setMapping(inferImportMapping(csv.headers))
    importAction.reset()
    setFurthest(1)
    setStep(1)
  }

  function handleReset() {
    setFile(null)
    setParsed(null)
    setMapping({})
    importAction.reset()
    setFurthest(0)
    setStep(0)
  }

  const canLeaveFile = parsed !== null
  const canLeaveMapping = missingRequiredColumns(mapping).length === 0

  return (
    <div className="flex w-full flex-col gap-5">
      <PromotionStepper steps={STEPS} current={step} onStepClick={goToStep} />

      {step === 0 && (
        <ImportStepFile
          file={file}
          onFileParsed={handleFileParsed}
          onRemove={handleReset}
          templateSamples={templateSamples}
          today={today}
        />
      )}

      {step === 1 && parsed && (
        <ImportStepMapping
          headers={parsed.headers}
          mapping={mapping}
          onChange={setMapping}
        />
      )}

      {step === 2 && (
        <ImportStepPreview
          ready={validation.ready}
          failures={validation.failures}
          report={report}
          isPending={importAction.isPending}
          errorMessage={importError}
          onImport={() =>
            importAction.execute({
              filename: file?.name ?? "importacion.csv",
              rows: rawRows,
            })
          }
        />
      )}

      {step === 3 && importAction.result.data && (
        <ImportStepResult
          result={importAction.result.data}
          onReset={handleReset}
        />
      )}

      {step < 3 && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => goToStep(step - 1)}
            disabled={step === 0}
          >
            Anterior
          </Button>
          {step < 2 && (
            <Button
              type="button"
              onClick={() => {
                setFurthest(Math.max(furthest, step + 1))
                setStep(step + 1)
              }}
              disabled={step === 0 ? !canLeaveFile : !canLeaveMapping}
            >
              Siguiente
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
