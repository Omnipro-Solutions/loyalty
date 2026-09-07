"use client"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"

import {
  exportAccumulationsAction,
  previewAccumulationsExportAction,
} from "../actions/accumulations-export"
import { ACCUMULATIONS_EXPORT_COLUMN_OPTIONS } from "../lib/accumulation-export-columns"
import type { AccumulationFiltersInput } from "../schemas"

const ENTITY = { singular: "acumulación", plural: "acumulaciones" }

/** Mismo patrón que `ExportMembersButton`: conteo previo y selección de columnas antes de descargar. */
export function ExportAccumulationsButton({
  filters,
}: {
  filters: AccumulationFiltersInput
}) {
  const dialog = useCsvExportDialog({
    previewAction: previewAccumulationsExportAction,
    exportAction: exportAccumulationsAction,
    columnOptions: ACCUMULATIONS_EXPORT_COLUMN_OPTIONS,
    filters,
    onStatus: notifyExportStatus,
  })

  return (
    <>
      <ExportCsvButton onExport={dialog.openDialog} />
      <ExportDialog
        {...dialog}
        title="Exportar acumulaciones"
        entity={ENTITY}
        columns={ACCUMULATIONS_EXPORT_COLUMN_OPTIONS}
      />
    </>
  )
}
