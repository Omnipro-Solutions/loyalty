"use server"

import {
  buildCsvRows,
  pickColumns,
  type CsvExportResult,
  type CsvPreviewResult,
} from "@/lib/csv"

import { hasPermission } from "./permissions"
import { builderActionClient } from "./action-client"
import {
  WORKFLOWS_EXPORT_COLUMNS,
  WORKFLOWS_EXPORT_FILENAME,
} from "./export-columns"
import { countWorkflows, listAllWorkflows } from "./queries"
import { exportWorkflowsSchema, workflowsExportFiltersSchema } from "./schemas"

// FASE 3 — `exportar` todavía no está en `ACTION_SCOPE` para `journeys`
// (solo `clientes`/`cupones`, ver `src/lib/permissions.ts`); cuando se
// extienda, el gate va aquí: `hasPermission(ctx.permissionsSet, "journeys", "exportar")`.

/** Conteo previo a exportar — lo pide `ExportDialog` al abrirse. */
export const previewWorkflowsExportAction = builderActionClient
  .inputSchema(workflowsExportFiltersSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvPreviewResult> => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "exportar")) {
      return {
        ok: false,
        message: "No tienes permiso para exportar reglas.",
      }
    }

    const total = await countWorkflows(parsedInput)
    return { ok: true, total }
  })

/** Universo completo filtrado (toolbar de `/journeys`), no la página en pantalla. */
export const exportWorkflowsAction = builderActionClient
  .inputSchema(exportWorkflowsSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvExportResult> => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "exportar")) {
      return {
        ok: false,
        message: "No tienes permiso para exportar reglas.",
      }
    }

    const { columns, ...filters } = parsedInput
    const { items, total, truncated } = await listAllWorkflows(filters)
    return {
      ok: true,
      filename: WORKFLOWS_EXPORT_FILENAME,
      rows: buildCsvRows(pickColumns(WORKFLOWS_EXPORT_COLUMNS, columns), items),
      total,
      truncated,
    }
  })
