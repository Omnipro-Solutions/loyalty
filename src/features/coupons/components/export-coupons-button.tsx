"use client"

import { ExportCsvButton } from "@/components/data/export-csv-button"
import { ExportDialog } from "@/components/data/export-dialog"
import { notifyExportStatus } from "@/components/feedback/export-toast"
import { useCsvExportDialog } from "@/hooks/use-csv-export-dialog"

import {
  exportCouponsListAction,
  previewCouponsListExportAction,
} from "../actions/export"
import {
  COUPON_BATCHES_EXPORT_COLUMN_OPTIONS,
  COUPONS_EXPORT_COLUMN_OPTIONS,
} from "../lib/export-columns"
import type { CouponsListExportFiltersInput } from "../schemas"

const BATCHES_ENTITY = { singular: "emisión", plural: "emisiones" }
const COUPONS_ENTITY = { singular: "cupón", plural: "cupones" }

type ExportCouponsButtonProps = { filters: CouponsListExportFiltersInput }

/**
 * "Exportar" (13.1): una sola action para las dos vistas, discriminada por
 * `filters.view` — un solo `useCsvExportDialog`, en vez de llamar el hook
 * dos veces condicionalmente (regla de hooks de React).
 */
export function ExportCouponsButton({ filters }: ExportCouponsButtonProps) {
  const columnOptions =
    filters.view === "batches"
      ? COUPON_BATCHES_EXPORT_COLUMN_OPTIONS
      : COUPONS_EXPORT_COLUMN_OPTIONS
  const entity = filters.view === "batches" ? BATCHES_ENTITY : COUPONS_ENTITY
  const title =
    filters.view === "batches" ? "Exportar emisiones" : "Exportar cupones"

  const dialog = useCsvExportDialog({
    previewAction: previewCouponsListExportAction,
    exportAction: exportCouponsListAction,
    columnOptions,
    filters,
    onStatus: notifyExportStatus,
  })

  return (
    <>
      <ExportCsvButton onExport={dialog.openDialog} />
      <ExportDialog
        {...dialog}
        title={title}
        entity={entity}
        columns={columnOptions}
      />
    </>
  )
}
