"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { promotionsActionClient } from "./action-client"
import { hasPermission } from "../lib/permissions"
import {
  buildImportCatalogs,
  validateImportBatch,
  MAX_IMPORT_ROWS,
  PROMOTION_IMPORT_COLUMNS,
  type ImportFailure,
  type PromotionImportColumnKey,
  type RawImportRow,
} from "../lib/promotion-import"
import {
  listConditionCategories,
  listConditionCities,
  listConditionSegments,
  listConditionTiers,
  listCouponBatchesForPromotions,
  listProductRefsForImport,
  listSuppliers,
} from "../lib/queries"
import { toRow } from "../lib/to-row"

const DB_CODE_CHUNK_SIZE = 200

/**
 * Espejo de `RawImportRow` DERIVADO de `PROMOTION_IMPORT_COLUMNS`, no
 * escrito a mano: cuando era una lista manual, agregar una columna al CSV
 * y olvidarla aquí la dejaba fuera del payload de la Server Action en
 * silencio. Toda celda es texto libre acotado — quien valida el contenido
 * es `validateImportBatch`, no este schema.
 */
const cellSchemas = Object.fromEntries(
  PROMOTION_IMPORT_COLUMNS.map((column) => [column.key, z.string().max(500)])
) as Record<PromotionImportColumnKey, z.ZodString>

const rawRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  ...cellSchemas,
}) satisfies z.ZodType<RawImportRow>

const importPromotionsSchema = z.object({
  filename: z.string().max(200),
  rows: z
    .array(rawRowSchema)
    .min(1, "El archivo no tiene filas.")
    .max(MAX_IMPORT_ROWS, `Máximo ${MAX_IMPORT_ROWS} filas por archivo.`),
})

export type ImportPromotionsResult =
  | { ok: true; created: number; failed: ImportFailure[] }
  | { ok: false; message: string }

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

const sortByRow = (a: ImportFailure, b: ImportFailure) =>
  a.rowNumber - b.rowNumber

/**
 * Importación masiva de promociones desde CSV — solo necesita el permiso
 * "crear" (nunca "aprobar"), porque toda fila entra forzada como `borrador`
 * sin importar lo que diga el archivo. Un `insert` de Postgres es atómico,
 * así que la semántica de "importación parcial" se logra eliminando de
 * antemano todas las causas conocidas de fallo (`validateImportBatch` +
 * duplicados contra la BD) y dejando el insert masivo como camino feliz; si
 * aun así falla (típicamente una carrera sobre el índice único de
 * `codigo`), se reintenta fila por fila para aislar la culpable sin perder
 * las demás.
 */
export const importPromotionsAction = promotionsActionClient
  .inputSchema(importPromotionsSchema)
  .action(async ({ parsedInput, ctx }): Promise<ImportPromotionsResult> => {
    if (!hasPermission(ctx.permissionsSet, "promociones", "crear")) {
      return {
        ok: false,
        message: "No tienes permiso para crear promociones.",
      }
    }

    const rowByNumber = new Map<number, RawImportRow>(
      parsedInput.rows.map((r) => [r.rowNumber, r])
    )

    const [
      categories,
      segments,
      cities,
      products,
      couponBatches,
      tiers,
      suppliers,
    ] = await Promise.all([
      listConditionCategories(),
      listConditionSegments(),
      listConditionCities(),
      listProductRefsForImport(),
      listCouponBatchesForPromotions(),
      listConditionTiers(),
      listSuppliers(),
    ])
    const catalogs = buildImportCatalogs(
      categories,
      segments,
      cities,
      products,
      {
        couponBatches,
        tiers,
        suppliers,
      }
    )

    const { ready, failures } = validateImportBatch(parsedInput.rows, catalogs)

    function finish(created: number): ImportPromotionsResult {
      if (created > 0) revalidatePath("/promociones")
      return { ok: true, created, failed: failures.sort(sortByRow) }
    }

    // Duplicados contra la BD — la unicidad real es (org_id, codigo); RLS ya
    // acota por org_id, así que basta con comparar por código. Los chunks son
    // consultas independientes entre sí — se lanzan en paralelo.
    let survivors = ready
    if (ready.length > 0) {
      const existing = new Set<string>()
      const chunkResults = await Promise.all(
        chunk(
          ready.map((r) => r.values.code),
          DB_CODE_CHUNK_SIZE
        ).map((group) =>
          ctx.supabase.from("promociones").select("codigo").in("codigo", group)
        )
      )
      for (const { data } of chunkResults) {
        for (const row of data ?? []) existing.add(row.codigo)
      }

      survivors = ready.filter((r) => !existing.has(r.values.code))
      for (const r of ready) {
        if (!existing.has(r.values.code)) continue
        const row = rowByNumber.get(r.rowNumber)
        if (!row) continue
        failures.push({
          rowNumber: r.rowNumber,
          row,
          errors: [
            {
              column: "codigo",
              message: "Ya existe una promoción con ese código.",
            },
          ],
        })
      }
    }

    if (survivors.length === 0) {
      return finish(0)
    }

    const { data: inserted, error } = await ctx.supabase
      .from("promociones")
      .insert(survivors.map((r) => ({ org_id: ctx.orgId, ...toRow(r.values) })))
      .select("id")

    if (!error) {
      return finish(inserted?.length ?? 0)
    }

    // El insert masivo falló (típicamente una carrera sobre el índice único
    // de `codigo`) — cada fila apunta a un `codigo` distinto, así que los
    // reintentos fila-por-fila son independientes entre sí y se lanzan en
    // paralelo en vez de esperar uno por uno.
    const rowResults = await Promise.all(
      survivors.map(async (survivor) => {
        const { error: rowError } = await ctx.supabase
          .from("promociones")
          .insert({ org_id: ctx.orgId, ...toRow(survivor.values) })
        return { survivor, rowError }
      })
    )

    let created = 0
    for (const { survivor, rowError } of rowResults) {
      if (!rowError) {
        created += 1
        continue
      }
      const row = rowByNumber.get(survivor.rowNumber)
      if (!row) continue
      failures.push({
        rowNumber: survivor.rowNumber,
        row,
        errors: [
          {
            column: rowError.code === "23505" ? "codigo" : null,
            message:
              rowError.code === "23505"
                ? "Ya existe una promoción con ese código."
                : "No se pudo crear la promoción.",
          },
        ],
      })
    }

    return finish(created)
  })
