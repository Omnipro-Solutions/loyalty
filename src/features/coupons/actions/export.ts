"use server"

import {
  buildCsvRows,
  pickColumns,
  type CsvExportResult,
  type CsvPreviewResult,
} from "@/lib/csv"

import { couponsActionClient } from "./action-client"
import {
  BATCH_COUPONS_EXPORT_COLUMNS,
  BATCH_COUPONS_EXPORT_FILENAME_FALLBACK,
  COUPON_BATCHES_EXPORT_COLUMNS,
  COUPON_BATCHES_EXPORT_FILENAME,
  COUPONS_EXPORT_COLUMNS,
  COUPONS_EXPORT_FILENAME,
} from "../lib/export-columns"
import { hasPermission } from "../lib/permissions"
import {
  countCouponBatches,
  countCoupons,
  countCouponsForBatch,
  listAllCouponBatches,
  listAllCoupons,
  listAllCouponsForBatch,
} from "../lib/queries"
import {
  exportBatchCouponsSchema,
  exportCouponsListSchema,
  previewBatchCouponsExportSchema,
  previewCouponsListExportSchema,
} from "../schemas"

/** Gate compartido por las 4 actions de este archivo — mismo recurso, mismo mensaje. */
function couponsExportDenied(
  permissionsSet: Set<string>
): { ok: false; message: string } | null {
  if (hasPermission(permissionsSet, "cupones", "exportar")) return null
  return { ok: false, message: "No tienes permiso para exportar cupones." }
}

/** Conteo previo a exportar — lo pide `ExportDialog` al abrirse. */
export const previewBatchCouponsExportAction = couponsActionClient
  .inputSchema(previewBatchCouponsExportSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvPreviewResult> => {
    const denied = couponsExportDenied(ctx.permissionsSet)
    if (denied) return denied
    const total = await countCouponsForBatch(parsedInput.batchId)
    return { ok: true, total }
  })

/**
 * Devuelve las filas ya listas para CSV — no dispara la descarga (eso pasa
 * en el cliente, `export-batch-coupons-button.tsx`) porque una Server
 * Action no puede iniciar un `Blob`/`<a download>` en el navegador.
 */
export const exportBatchCouponsAction = couponsActionClient
  .inputSchema(exportBatchCouponsSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvExportResult> => {
    const denied = couponsExportDenied(ctx.permissionsSet)
    if (denied) return denied

    const { rows, total, truncated } = await listAllCouponsForBatch(
      parsedInput.batchId
    )
    return {
      ok: true,
      filename: `${rows[0]?.batch_reference ?? BATCH_COUPONS_EXPORT_FILENAME_FALLBACK}.csv`,
      rows: buildCsvRows(
        pickColumns(BATCH_COUPONS_EXPORT_COLUMNS, parsedInput.columns),
        rows
      ),
      total,
      truncated,
    }
  })

/**
 * Conteo previo del listado (13.1) — una sola action para las dos vistas,
 * discriminada por `view`, así el cliente usa un solo `useAction` en vez de
 * llamar dos hooks incondicionalmente (`ExportCouponsButton` recibe un
 * único prop `view` igual que ya hacía antes de tener Server Action).
 */
export const previewCouponsListExportAction = couponsActionClient
  .inputSchema(previewCouponsListExportSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvPreviewResult> => {
    const denied = couponsExportDenied(ctx.permissionsSet)
    if (denied) return denied
    const total =
      parsedInput.view === "batches"
        ? await countCouponBatches(parsedInput)
        : await countCoupons(parsedInput)
    return { ok: true, total }
  })

/** Universo completo filtrado (13.1 "Exportar"), no la página en pantalla. */
export const exportCouponsListAction = couponsActionClient
  .inputSchema(exportCouponsListSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvExportResult> => {
    const denied = couponsExportDenied(ctx.permissionsSet)
    if (denied) return denied

    const { columns, ...filters } = parsedInput
    if (filters.view === "batches") {
      const { batches, total, truncated } = await listAllCouponBatches(filters)
      return {
        ok: true,
        filename: COUPON_BATCHES_EXPORT_FILENAME,
        rows: buildCsvRows(
          pickColumns(COUPON_BATCHES_EXPORT_COLUMNS, columns),
          batches
        ),
        total,
        truncated,
      }
    }

    const { coupons, total, truncated } = await listAllCoupons(filters)
    return {
      ok: true,
      filename: COUPONS_EXPORT_FILENAME,
      rows: buildCsvRows(pickColumns(COUPONS_EXPORT_COLUMNS, columns), coupons),
      total,
      truncated,
    }
  })
