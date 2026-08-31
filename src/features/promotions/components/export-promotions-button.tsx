"use client"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"

import {
  exportPromotionsAction,
  previewPromotionsExportAction,
} from "../actions/export"
import { PROMOTIONS_EXPORT_COLUMN_OPTIONS } from "../lib/export-columns"
import type { PromotionsExportFiltersInput } from "../schemas"

const ENTITY = { singular: "promoción", plural: "promociones" }

type ExportPromotionsButtonProps = { filters: PromotionsExportFiltersInput }

/** "Exportar" (06.1): abre un diálogo de revisión — cuántas promociones
 *  matchean los filtros y qué columnas incluir — antes de descargar. */
export function ExportPromotionsButton({
  filters,
}: ExportPromotionsButtonProps) {
  const dialog = useCsvExportDialog({
    previewAction: previewPromotionsExportAction,
    exportAction: exportPromotionsAction,
    columnOptions: PROMOTIONS_EXPORT_COLUMN_OPTIONS,
    filters,
    onStatus: notifyExportStatus,
  })

  return (
    <>
      <ExportCsvButton onExport={dialog.openDialog} />
      <ExportDialog
        {...dialog}
        title="Exportar promociones"
        entity={ENTITY}
        columns={PROMOTIONS_EXPORT_COLUMN_OPTIONS}
      />
    </>
  )
}
