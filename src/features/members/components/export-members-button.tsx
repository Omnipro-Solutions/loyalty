"use client"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"

import {
  exportMembersAction,
  previewMembersExportAction,
} from "../actions/export"
import { MEMBERS_EXPORT_COLUMN_OPTIONS } from "../lib/export-columns"
import type { MemberExportFiltersInput } from "../schemas"

const ENTITY = { singular: "cliente", plural: "clientes" }

type ExportMembersButtonProps = { filters: MemberExportFiltersInput }

/** "Exportar" (05.1): abre un diálogo de revisión — cuántos clientes
 *  matchean los filtros y qué columnas incluir — antes de descargar. */
export function ExportMembersButton({ filters }: ExportMembersButtonProps) {
  const dialog = useCsvExportDialog({
    previewAction: previewMembersExportAction,
    exportAction: exportMembersAction,
    columnOptions: MEMBERS_EXPORT_COLUMN_OPTIONS,
    filters,
    onStatus: notifyExportStatus,
  })

  return (
    <>
      <ExportCsvButton onExport={dialog.openDialog} />
      <ExportDialog
        {...dialog}
        title="Exportar clientes"
        entity={ENTITY}
        columns={MEMBERS_EXPORT_COLUMN_OPTIONS}
      />
    </>
  )
}
