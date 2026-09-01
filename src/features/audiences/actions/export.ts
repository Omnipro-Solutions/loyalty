"use server"

import {
  buildCsvRows,
  pickColumns,
  type CsvExportResult,
  type CsvPreviewResult,
} from "@/lib/csv"

import { hasPermission } from "../lib/permissions"
import { audiencesActionClient } from "./action-client"
import {
  AUDIENCES_EXPORT_COLUMNS,
  AUDIENCES_EXPORT_FILENAME,
} from "../lib/export-columns"
import { countAudiences, listAllAudiences } from "../lib/queries"
import { audiencesExportFiltersSchema, exportAudiencesSchema } from "../schemas"

// FASE 3 — `audiencias` ni siquiera está en `RESOURCES`
// (`src/lib/permissions.ts`) todavía; el gate de export queda pendiente de
// esa decisión (recurso propio vs. montar sobre `clientes:exportar`).

/** Conteo previo a exportar — lo pide `ExportDialog` al abrirse. */
export const previewAudiencesExportAction = audiencesActionClient
  .inputSchema(audiencesExportFiltersSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvPreviewResult> => {
    if (!hasPermission(ctx.permissionsSet, "clientes", "exportar")) {
      return {
        ok: false,
        message: "No tienes permiso para exportar audiencias.",
      }
    }

    const total = await countAudiences(parsedInput)
    return { ok: true, total }
  })

/** Universo completo filtrado y ordenado (11.1 "Exportar"), no la página en pantalla. */
export const exportAudiencesAction = audiencesActionClient
  .inputSchema(exportAudiencesSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvExportResult> => {
    if (!hasPermission(ctx.permissionsSet, "clientes", "exportar")) {
      return {
        ok: false,
        message: "No tienes permiso para exportar audiencias.",
      }
    }

    const { columns, ...filters } = parsedInput
    const { audiences, total, truncated } = await listAllAudiences(filters)
    return {
      ok: true,
      filename: AUDIENCES_EXPORT_FILENAME,
      rows: buildCsvRows(
        pickColumns(AUDIENCES_EXPORT_COLUMNS, columns),
        audiences
      ),
      total,
      truncated,
    }
  })
