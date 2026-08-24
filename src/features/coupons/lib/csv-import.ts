/**
 * Importar CSV (doc §3.6): una fila = un cupón; filas sin coincidencia con
 * ningún socio se emiten al portador. Todo se parsea en el navegador — no
 * hay bucket de Storage configurado en este proyecto, así que la Server
 * Action recibe filas ya normalizadas, no el archivo.
 */

export type ParsedCsv = { headers: string[]; rows: string[][] }

/** Parser mínimo (no RFC 4180 completo): soporta comillas dobles y comas dentro de campos citados, que cubre lo que exporta cualquier hoja de cálculo común. */
export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim().length > 0)
  const rows = lines.map(parseCsvLine)
  const [headers = [], ...body] = rows
  return { headers, rows: body }
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      cells.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

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
  const mapping: ColumnMapping = {}
  for (const { key } of COUPON_IMPORT_COLUMNS) {
    const index = headers.findIndex((h) => HEADER_HINTS[key].test(h))
    if (index >= 0) mapping[key] = index
  }
  return mapping
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
