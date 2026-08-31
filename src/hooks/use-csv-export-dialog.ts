"use client"

import { useState } from "react"
import { useAction } from "next-safe-action/hooks"
import type { SingleInputActionFn } from "next-safe-action/hooks"

import {
  downloadCsv,
  exportStatus,
  previewError,
  type CsvExportResult,
  type CsvPreviewResult,
  type ExportStatus,
} from "@/lib/csv"

type ExportColumnOption = { key: string; label: string }

/** `any` en los 4 genéricos (no `unknown`): es la única cota que acepta
 *  cualquier `previewXAction`/`exportXAction` concreta sin que la
 *  contravarianza del parámetro `input` de `SingleInputActionFn` rechace la
 *  asignación — cada `useCsvExportDialog<PA, EA>(...)` sigue infiriendo el
 *  tipo exacto de la action que le pasa cada feature. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver docblock: única cota que evita el rechazo por contravarianza
type AnyCsvAction<Data> = SingleInputActionFn<any, any, any, Data>

type UseCsvExportDialogOptions<
  PA extends AnyCsvAction<CsvPreviewResult>,
  EA extends AnyCsvAction<CsvExportResult>,
  Filters,
> = {
  previewAction: PA
  exportAction: EA
  columnOptions: readonly ExportColumnOption[]
  /** Filtros de la página actual (sin `columns`) — se recalculan en cada
   *  render, así que siempre están al día cuando se abre el diálogo. Tipado
   *  como el propio `XExportFiltersInput` de cada feature, no derivado del
   *  schema de `PA`: preservar esa relación a nivel de tipos a través de
   *  `SingleInputActionFn` no vale la complejidad, así que `execute()` abajo
   *  hace un cast puntual — cualquier desajuste real lo atrapa la
   *  validación zod de la action en runtime, igual que antes de extraer
   *  este hook. */
  filters: Filters
  /** Toast al terminar preview o export — inyectado por el llamador porque
   *  este hook vive en `hooks/`, que no puede importar de `components/`
   *  (ver CLAUDE.md §2). Cada `ExportXButton` pasa `notifyExportStatus`. */
  onStatus: (status: ExportStatus) => void
  fallbackExportError?: string
  fallbackPreviewError?: string
}

/**
 * Orquesta el diálogo de revisión previa a exportar (abrir, pedir el
 * conteo, elegir columnas, confirmar, descargar) — la misma máquina de
 * estados que se repetía casi al carácter en los 7 `ExportXButton` de las
 * features (más el toolbar de journeys y el export de un batch de
 * cupones). Cada llamador sigue dueño de la parte visual: construye
 * `columnOptions`/`title`/`entity` y renderiza `<ExportCsvButton>` +
 * `<ExportDialog>` con lo que este hook devuelve.
 */
export function useCsvExportDialog<
  PA extends AnyCsvAction<CsvPreviewResult>,
  EA extends AnyCsvAction<CsvExportResult>,
  Filters extends object,
>({
  previewAction,
  exportAction,
  columnOptions,
  filters,
  onStatus,
  fallbackExportError = "No se pudo exportar el listado.",
  fallbackPreviewError = "No se pudo calcular el total.",
}: UseCsvExportDialogOptions<PA, EA, Filters>) {
  const allColumnKeys = columnOptions.map((c) => c.key)

  const [open, setOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(allColumnKeys)

  const preview = useAction(previewAction)
  const runExport = useAction(exportAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      downloadCsv(data.filename, data.rows)
      setOpen(false)
    },
    onSettled: ({ result }) => {
      onStatus(exportStatus(result, fallbackExportError))
    },
  })

  function openDialog() {
    setSelectedKeys(allColumnKeys)
    setOpen(true)
    preview.execute(filters as Parameters<PA>[0])
  }

  function onToggleColumn(key: string, checked: boolean) {
    setSelectedKeys((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key)
    )
  }

  function onToggleAll(checked: boolean) {
    setSelectedKeys(checked ? allColumnKeys : [])
  }

  function onConfirm() {
    runExport.execute({
      ...filters,
      columns: selectedKeys,
    } as Parameters<EA>[0])
  }

  return {
    open,
    onOpenChange: setOpen,
    openDialog,
    selectedKeys,
    onToggleColumn,
    onToggleAll,
    onConfirm,
    pending: runExport.isPending,
    total: preview.result.data?.ok ? preview.result.data.total : null,
    totalPending: preview.isPending,
    totalError: previewError(preview.result, fallbackPreviewError),
  }
}
