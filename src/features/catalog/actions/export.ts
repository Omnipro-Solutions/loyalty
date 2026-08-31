"use server"

import {
  buildCsvRows,
  pickColumns,
  type CsvExportResult,
  type CsvPreviewResult,
} from "@/lib/csv"

import { catalogActionClient } from "./action-client"
import {
  PRODUCTS_EXPORT_COLUMNS,
  PRODUCTS_EXPORT_FILENAME,
} from "../lib/export-columns"
import { countProducts, listAllProducts } from "../lib/queries"
import { catalogExportFiltersSchema, exportProductsSchema } from "../schemas"

// FASE 3 — `exportar` todavía no está en `ACTION_SCOPE` para `catalogo`
// (solo `clientes`/`cupones`, ver `src/lib/permissions.ts`); cuando se
// extienda, el gate va aquí: `hasPermission(ctx.permissionsSet, "catalogo", "exportar")`.

/** Conteo previo a exportar — lo pide `ExportDialog` al abrirse. */
export const previewProductsExportAction = catalogActionClient
  .inputSchema(catalogExportFiltersSchema)
  .action(async ({ parsedInput }): Promise<CsvPreviewResult> => {
    const total = await countProducts(parsedInput)
    return { ok: true, total }
  })

/** Universo completo filtrado (03.1 "Exportar"), no la página en pantalla. */
export const exportProductsAction = catalogActionClient
  .inputSchema(exportProductsSchema)
  .action(async ({ parsedInput }): Promise<CsvExportResult> => {
    const { columns, ...filters } = parsedInput
    const { products, total, truncated } = await listAllProducts(filters)
    return {
      ok: true,
      filename: PRODUCTS_EXPORT_FILENAME,
      rows: buildCsvRows(
        pickColumns(PRODUCTS_EXPORT_COLUMNS, columns),
        products
      ),
      total,
      truncated,
    }
  })
