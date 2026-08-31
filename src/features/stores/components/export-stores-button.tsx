"use client"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"

import {
  exportStoresAction,
  previewStoresExportAction,
} from "../actions/export"
import { STORES_EXPORT_COLUMN_OPTIONS } from "../lib/export-columns"
import type { StoresExportFiltersInput } from "../schemas"

const ENTITY = { singular: "tienda", plural: "tiendas" }

type ExportStoresButtonProps = { filters: StoresExportFiltersInput }

/** "Exportar" (04.1): abre un diálogo de revisión — cuántas tiendas
 *  matchean los filtros y qué columnas incluir — antes de descargar. */
export function ExportStoresButton({ filters }: ExportStoresButtonProps) {
  const dialog = useCsvExportDialog({
    previewAction: previewStoresExportAction,
    exportAction: exportStoresAction,
    columnOptions: STORES_EXPORT_COLUMN_OPTIONS,
    filters,
    onStatus: notifyExportStatus,
  })

  return (
    <>
      <ExportCsvButton onExport={dialog.openDialog} />
      <ExportDialog
        {...dialog}
        title="Exportar tiendas"
        entity={ENTITY}
        columns={STORES_EXPORT_COLUMN_OPTIONS}
      />
    </>
  )
}
