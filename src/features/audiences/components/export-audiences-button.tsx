"use client"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"

import {
  exportAudiencesAction,
  previewAudiencesExportAction,
} from "../actions/export"
import { AUDIENCES_EXPORT_COLUMN_OPTIONS } from "../lib/export-columns"
import type { AudiencesExportFiltersInput } from "../schemas"

const ENTITY = { singular: "audiencia", plural: "audiencias" }

type ExportAudiencesButtonProps = { filters: AudiencesExportFiltersInput }

/** "Exportar" (11.1): abre un diálogo de revisión — cuántas audiencias
 *  matchean los filtros y qué columnas incluir — antes de descargar. */
export function ExportAudiencesButton({ filters }: ExportAudiencesButtonProps) {
  const dialog = useCsvExportDialog({
    previewAction: previewAudiencesExportAction,
    exportAction: exportAudiencesAction,
    columnOptions: AUDIENCES_EXPORT_COLUMN_OPTIONS,
    filters,
    onStatus: notifyExportStatus,
  })

  return (
    <>
      <ExportCsvButton onExport={dialog.openDialog} />
      <ExportDialog
        {...dialog}
        title="Exportar audiencias"
        entity={ENTITY}
        columns={AUDIENCES_EXPORT_COLUMN_OPTIONS}
      />
    </>
  )
}
