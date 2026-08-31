"use server"

import {
  buildCsvRows,
  pickColumns,
  type CsvExportResult,
  type CsvPreviewResult,
} from "@/lib/csv"

import { promotionsActionClient } from "./action-client"
import {
  PROMOTIONS_EXPORT_COLUMNS,
  PROMOTIONS_EXPORT_FILENAME,
} from "../lib/export-columns"
import { countPromotions, listAllPromotions } from "../lib/queries"
import {
  exportPromotionsSchema,
  promotionsExportFiltersSchema,
} from "../schemas"

// FASE 3 — `exportar` todavía no está en `ACTION_SCOPE` para `promociones`
// (solo `clientes`/`cupones`, ver `src/lib/permissions.ts`); cuando se
// extienda, el gate va aquí: `hasPermission(ctx.permissionsSet, "promociones", "exportar")`.

/** Conteo previo a exportar — lo pide `ExportDialog` al abrirse. */
export const previewPromotionsExportAction = promotionsActionClient
  .inputSchema(promotionsExportFiltersSchema)
  .action(async ({ parsedInput }): Promise<CsvPreviewResult> => {
    const total = await countPromotions(parsedInput)
    return { ok: true, total }
  })

/** Universo completo filtrado (06.1 "Exportar"), no la página en pantalla. */
export const exportPromotionsAction = promotionsActionClient
  .inputSchema(exportPromotionsSchema)
  .action(async ({ parsedInput }): Promise<CsvExportResult> => {
    const { columns, ...filters } = parsedInput
    const { promotions, total, truncated } = await listAllPromotions(filters)
    return {
      ok: true,
      filename: PROMOTIONS_EXPORT_FILENAME,
      rows: buildCsvRows(
        pickColumns(PROMOTIONS_EXPORT_COLUMNS, columns),
        promotions
      ),
      total,
      truncated,
    }
  })
