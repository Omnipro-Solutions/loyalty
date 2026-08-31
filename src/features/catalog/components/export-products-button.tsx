"use client"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"

import {
  exportProductsAction,
  previewProductsExportAction,
} from "../actions/export"
import { PRODUCTS_EXPORT_COLUMN_OPTIONS } from "../lib/export-columns"
import type { CatalogExportFiltersInput } from "../schemas"

const ENTITY = { singular: "producto", plural: "productos" }

type ExportProductsButtonProps = { filters: CatalogExportFiltersInput }

/** "Exportar" (03.1): abre un diálogo de revisión — cuántos productos
 *  matchean los filtros y qué columnas incluir — antes de descargar. */
export function ExportProductsButton({ filters }: ExportProductsButtonProps) {
  const dialog = useCsvExportDialog({
    previewAction: previewProductsExportAction,
    exportAction: exportProductsAction,
    columnOptions: PRODUCTS_EXPORT_COLUMN_OPTIONS,
    filters,
    onStatus: notifyExportStatus,
  })

  return (
    <>
      <ExportCsvButton onExport={dialog.openDialog} />
      <ExportDialog
        {...dialog}
        title="Exportar catálogo"
        entity={ENTITY}
        columns={PRODUCTS_EXPORT_COLUMN_OPTIONS}
      />
    </>
  )
}
