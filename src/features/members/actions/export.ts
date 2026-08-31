"use server"

import {
  buildCsvRows,
  pickColumns,
  type CsvExportResult,
  type CsvPreviewResult,
} from "@/lib/csv"

import { membersPermissionActionClient } from "./action-client"
import {
  MEMBERS_EXPORT_COLUMNS,
  MEMBERS_EXPORT_FILENAME,
} from "../lib/export-columns"
import { hasPermission } from "../lib/permissions"
import { countMembers, listAllMembers } from "../lib/queries"
import { exportMembersSchema, memberExportFiltersSchema } from "../schemas"

/** Gate compartido por las 2 actions de este archivo — mismo recurso, mismo mensaje. */
function membersExportDenied(
  permissionsSet: Set<string>
): { ok: false; message: string } | null {
  if (hasPermission(permissionsSet, "clientes", "exportar")) return null
  return { ok: false, message: "No tienes permiso para exportar clientes." }
}

/**
 * Conteo de clientes que matchean los filtros — lo pide `ExportDialog` al
 * abrirse, antes de que el usuario confirme el export. Mismo gate de
 * permiso que la exportación real: si no puede exportar, tampoco tiene
 * sentido mostrarle cuántas filas se está perdiendo.
 */
export const previewMembersExportAction = membersPermissionActionClient
  .inputSchema(memberExportFiltersSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvPreviewResult> => {
    const denied = membersExportDenied(ctx.permissionsSet)
    if (denied) return denied
    const total = await countMembers(parsedInput)
    return { ok: true, total }
  })

/**
 * Universo completo filtrado (05.1 "Exportar"), no la página en pantalla.
 * Gate de PII: `clientes` trae email/teléfono/documento, así que —igual que
 * `cupones:exportar`— se comprueba el permiso antes de consultar (ver la
 * migración que siembra `clientes:exportar` para gestor/admin, no lector).
 * `columns` (keys de `MEMBERS_EXPORT_COLUMN_OPTIONS`, elegidas en el
 * diálogo) filtra qué columnas incluye el CSV — vacío exporta todas.
 */
export const exportMembersAction = membersPermissionActionClient
  .inputSchema(exportMembersSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvExportResult> => {
    const denied = membersExportDenied(ctx.permissionsSet)
    if (denied) return denied

    const { columns, ...filters } = parsedInput
    const { members, total, truncated } = await listAllMembers(filters)
    return {
      ok: true,
      filename: MEMBERS_EXPORT_FILENAME,
      rows: buildCsvRows(pickColumns(MEMBERS_EXPORT_COLUMNS, columns), members),
      total,
      truncated,
    }
  })
