"use client"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"

import {
  exportBatchCouponsAction,
  previewBatchCouponsExportAction,
} from "../actions/export"
import { BATCH_COUPONS_EXPORT_COLUMN_OPTIONS } from "../lib/export-columns"

const ENTITY = { singular: "cupón", plural: "cupones" }

type ExportBatchCouponsButtonProps = { batchId: string }

export function ExportBatchCouponsButton({
  batchId,
}: ExportBatchCouponsButtonProps) {
  const dialog = useCsvExportDialog({
    previewAction: previewBatchCouponsExportAction,
    exportAction: exportBatchCouponsAction,
    columnOptions: BATCH_COUPONS_EXPORT_COLUMN_OPTIONS,
    filters: { batchId },
    onStatus: notifyExportStatus,
  })

  return (
    <>
      <ExportCsvButton
        variant="compact"
        label="Exportar CSV"
        onExport={dialog.openDialog}
      />
      <ExportDialog
        {...dialog}
        title="Exportar cupones de la emisión"
        entity={ENTITY}
        columns={BATCH_COUPONS_EXPORT_COLUMN_OPTIONS}
      />
    </>
  )
}
