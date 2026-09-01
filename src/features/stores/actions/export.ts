"use server"

import {
  buildCsvRows,
  pickColumns,
  type CsvExportResult,
  type CsvPreviewResult,
} from "@/lib/csv"

import { hasPermission } from "../lib/permissions"
import { storesActionClient } from "./action-client"
import {
  STORES_EXPORT_FILENAME,
  storesExportColumns,
} from "../lib/export-columns"
import { countStores, listAllStores, listStoreGroups } from "../lib/queries"
import { exportStoresSchema, storesExportFiltersSchema } from "../schemas"

// FASE 3 — `exportar` todavía no está en `ACTION_SCOPE` para `tiendas`
// (solo `clientes`/`cupones`, ver `src/lib/permissions.ts`); `storesActionClient`
// tampoco expone `permissionsSet` todavía — ambos hacen falta antes del gate.

/** Conteo previo a exportar — lo pide `ExportDialog` al abrirse. */
export const previewStoresExportAction = storesActionClient
  .inputSchema(storesExportFiltersSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvPreviewResult> => {
    if (!hasPermission(ctx.permissionsSet, "tiendas", "exportar")) {
      return {
        ok: false,
        message: "No tienes permiso para exportar tiendas.",
      }
    }

    const total = await countStores(parsedInput)
    return { ok: true, total }
  })

/**
 * Universo completo filtrado (04.1 "Exportar"), no la página en pantalla.
 * `groupNameById` se resuelve aquí (una llamada a `listStoreGroups()`) en
 * vez de en el cliente — antes `stores-export-slot.tsx` la duplicaba.
 */
export const exportStoresAction = storesActionClient
  .inputSchema(exportStoresSchema)
  .action(async ({ parsedInput, ctx }): Promise<CsvExportResult> => {
    if (!hasPermission(ctx.permissionsSet, "tiendas", "exportar")) {
      return {
        ok: false,
        message: "No tienes permiso para exportar tiendas.",
      }
    }

    const { columns, ...filters } = parsedInput
    const [{ stores, total, truncated }, groups] = await Promise.all([
      listAllStores(filters),
      listStoreGroups(),
    ])
    const groupNameById = new Map(groups.map((g) => [g.id, g.name]))
    return {
      ok: true,
      filename: STORES_EXPORT_FILENAME,
      rows: buildCsvRows(
        pickColumns(storesExportColumns(groupNameById), columns),
        stores
      ),
      total,
      truncated,
    }
  })
