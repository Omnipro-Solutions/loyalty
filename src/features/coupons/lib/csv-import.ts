/**
 * Importar CSV (doc §3.6): una fila = un cupón; filas sin coincidencia con
 * ningún socio se emiten al portador. Todo se parsea en el navegador — no
 * hay bucket de Storage configurado en este proyecto, así que la Server
 * Action recibe filas ya normalizadas, no el archivo.
 */

import { inferHeaderMapping, parseCsv, type ParsedCsv } from "@/lib/csv"

export { parseCsv }
export type { ParsedCsv }

export const COUPON_IMPORT_COLUMNS = [
  { key: "email", label: "Email del socio" },
  { key: "memberCode", label: "Código de socio" },
  { key: "code", label: "Código del cupón (opcional)" },
] as const
export type CouponImportColumnKey =
  (typeof COUPON_IMPORT_COLUMNS)[number]["key"]

export type ColumnMapping = Partial<Record<CouponImportColumnKey, number>>

const HEADER_HINTS: Record<CouponImportColumnKey, RegExp> = {
  email: /correo|email|mail/i,
  memberCode: /socio|member|cliente|codigo.*cliente/i,
  code: /codigo.*cupon|coupon.*code|^code$|^codigo$/i,
}

/** Heurística por nombre de columna — igual criterio que usaría alguien leyendo el header a simple vista. */
export function inferColumnMapping(headers: string[]): ColumnMapping {
  return inferHeaderMapping(
    headers,
    COUPON_IMPORT_COLUMNS.map((c) => c.key),
    HEADER_HINTS
  )
}

export type CouponImportRow = {
  email: string | null
  memberCode: string | null
  code: string | null
}

export function mapImportRows(
  parsed: ParsedCsv,
  mapping: ColumnMapping
): CouponImportRow[] {
  return parsed.rows.map((row) => ({
    email:
      mapping.email !== undefined ? (row[mapping.email]?.trim() ?? null) : null,
    memberCode:
      mapping.memberCode !== undefined
        ? (row[mapping.memberCode]?.trim() ?? null)
        : null,
    code:
      mapping.code !== undefined ? (row[mapping.code]?.trim() ?? null) : null,
  }))
}
