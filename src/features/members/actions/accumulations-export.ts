"use server"

import {
  buildCsvRows,
  pickColumns,
  type CsvExportResult,
  type CsvPreviewResult,
} from "@/lib/csv"

import { membersPermissionActionClient } from "./action-client"
import {
  ACCUMULATIONS_EXPORT_COLUMNS,
  ACCUMULATIONS_EXPORT_FILENAME,
} from "../lib/accumulation-export-columns"
import { hasPermission } from "../lib/permissions"
import { listAccumulations } from "../lib/queries"
import {
  accumulationFiltersSchema,
  exportAccumulationsSchema,
} from "../schemas"

/**
 * Va detrás de `clientes:exportar` y no de `promociones`: el CSV lleva
 * nombre y código de socio de quien está a punto de ganarse algo — es el
 * mismo dato personal por el que ya se le niega el export de clientes a
 * Analista.
 */
function denied(permissionsSet: Set<string>) {
  if (hasPermission(permissionsSet, "clientes", "exportar")) return null
  return {
    ok: false as const,
    message: "No tienes permiso para exportar datos de clientes.",
  }
}

/** Conteo previo — lo pide `ExportDialog` al abrirse. */
export const previewAccumulationsExportAction = membersPermissionActionClient
  .inputSchema(accumulationFiltersSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvPreviewResult> => {
    const no = denied(ctx.permissionsSet)
    if (no) return no
    const rows = await listAccumulations(parsedInput)
    return { ok: true, total: rows.length }
  })

export const exportAccumulationsAction = membersPermissionActionClient
  .inputSchema(exportAccumulationsSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvExportResult> => {
    const no = denied(ctx.permissionsSet)
    if (no) return no
    const { columns, ...filters } = parsedInput
    const rows = await listAccumulations(filters)
    return {
      ok: true,
      filename: ACCUMULATIONS_EXPORT_FILENAME,
      rows: buildCsvRows(
        pickColumns(ACCUMULATIONS_EXPORT_COLUMNS, columns),
        rows
      ),
      total: rows.length,
      truncated: false,
    }
  })
