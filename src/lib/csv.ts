import { formatNumber } from "@/lib/format"

export type ParsedCsv = { headers: string[]; rows: string[][] }

/** Cuenta ocurrencias de un delimitador candidato fuera de comillas en una línea. */
function countUnquoted(line: string, delimiter: string): number {
  let count = 0
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') inQuotes = !inQuotes
    else if (char === delimiter && !inQuotes) count += 1
  }
  return count
}

/** Excel en configuración regional es-CO/es-ES exporta con `;`, no `,` — se detecta contando ambos candidatos en la primera línea (si ninguno aparece, se asume `,`). */
function detectDelimiter(firstLine: string): "," | ";" | "\t" {
  const candidates = [",", ";", "\t"] as const
  let best: "," | ";" | "\t" = ","
  let bestCount = 0
  for (const candidate of candidates) {
    const count = countUnquoted(firstLine, candidate)
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/**
 * Parser mínimo (no RFC 4180 completo): soporta comillas dobles, el
 * delimitador detectado dentro de campos citados y saltos de línea dentro de
 * un campo citado — cubre lo que exporta cualquier hoja de cálculo común,
 * incluido Excel es-CO (delimitador `;`) y BOM (`﻿`, que Excel antepone
 * al guardar "CSV UTF-8"). Escanea el texto completo carácter a carácter en
 * una sola pasada, así que un salto de línea dentro de comillas es
 * contenido, no un corte de fila. Filas totalmente vacías se descartan.
 */
export function parseCsv(text: string): ParsedCsv {
  const withoutBom = text.startsWith("﻿") ? text.slice(1) : text
  const firstLineEnd = withoutBom.search(/\r\n|\n|\r/)
  const firstLine =
    firstLineEnd >= 0 ? withoutBom.slice(0, firstLineEnd) : withoutBom
  const delimiter = detectDelimiter(firstLine)

  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  const pushCell = () => {
    row.push(cell.trim())
    cell = ""
  }
  const pushRow = () => {
    pushCell()
    if (row.some((c) => c !== "")) rows.push(row)
    row = []
  }

  for (let i = 0; i < withoutBom.length; i += 1) {
    const char = withoutBom[i]
    if (inQuotes) {
      if (char === '"' && withoutBom[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      pushCell()
    } else if (char === "\r") {
      if (withoutBom[i + 1] === "\n") i += 1
      pushRow()
    } else if (char === "\n") {
      pushRow()
    } else {
      cell += char
    }
  }
  if (cell !== "" || row.length > 0) pushRow()

  const [headers = [], ...body] = rows
  return { headers, rows: body }
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

/**
 * Índice de columna para cada clave: pasada opcional de coincidencia exacta
 * normalizada primero, luego una pista regex por clave. Heurística
 * compartida por todos los importadores CSV del proyecto (cupones,
 * promociones) para que solo viva en un lugar.
 */
export function inferHeaderMapping<K extends string>(
  headers: string[],
  keys: readonly K[],
  hints: Record<K, RegExp>,
  normalize?: (header: string) => string
): Partial<Record<K, number>> {
  const normalized = normalize ? headers.map(normalize) : null
  const mapping: Partial<Record<K, number>> = {}
  for (const key of keys) {
    let index = normalized ? normalized.findIndex((h) => h === key) : -1
    if (index < 0) index = headers.findIndex((h) => hints[key].test(h))
    if (index >= 0) mapping[key] = index
  }
  return mapping
}

/**
 * Descarga un CSV generado en el navegador — sin bucket de Storage en este
 * proyecto, todo vive en memoria hasta el momento de la descarga. Las filas
 * van en texto plano; `csvCell` se aplica aquí adentro, así ningún llamador
 * puede olvidarlo. Antepone BOM (`﻿`): sin él, Excel es-CO/es-ES abre un
 * CSV UTF-8 como Windows-1252 y rompe cualquier acento ("Bogotá" →
 * "BogotÃ¡"). El separador de celda sigue siendo `,` — un preámbulo `sep=,`
 * arreglaría el separador de listas de Excel es-CO pero `parseCsv` (arriba)
 * lo leería como fila de cabecera. `parseCsv` ya descarta el BOM al importar,
 * así que descargar una plantilla y volver a subirla sigue funcionando.
 */
export function downloadCsv(filename: string, rows: readonly string[][]) {
  const text = rows.map((r) => r.map(csvCell).join(",")).join("\r\n")
  const blob = new Blob(["﻿", text], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Tope de filas de cualquier exportación. Ligado a `max_rows = 1000`
 *  (`supabase/config.toml`): 10 páginas de PostgREST por exportación. */
export const EXPORT_ROW_CAP = 10_000

/** Una columna de un CSV de exportación: `key` estable para el selector del
 *  diálogo de export (`ExportDialog`), cabecera + extractor a texto plano
 *  (sin comillas — las pone `downloadCsv`). */
export type CsvColumn<T> = {
  key: string
  header: string
  value: (row: T) => string
}

/** Cabecera + una fila por elemento, en texto plano. */
export function buildCsvRows<T>(
  columns: readonly CsvColumn<T>[],
  items: readonly T[]
): string[][] {
  return [
    columns.map((c) => c.header),
    ...items.map((item) => columns.map((c) => c.value(item))),
  ]
}

/**
 * Filtra columnas por `key` preservando el ORDEN de `columns`, no el de
 * `selectedKeys` — así el CSV sale siempre en el mismo orden sin importar en
 * qué secuencia se marcaron los checkboxes del diálogo. Sin selección (o
 * selección vacía/inválida) exporta todas las columnas.
 */
export function pickColumns<T>(
  columns: readonly CsvColumn<T>[],
  selectedKeys: readonly string[] | undefined
): CsvColumn<T>[] {
  if (!selectedKeys || selectedKeys.length === 0) return [...columns]
  const selected = new Set(selectedKeys)
  const picked = columns.filter((c) => selected.has(c.key))
  return picked.length > 0 ? picked : [...columns]
}

/** Payload común de toda Server Action de exportación. `rows` ya incluye la
 *  cabecera. `total` es el universo real en base, aunque `rows` venga
 *  recortado a `EXPORT_ROW_CAP`. */
export type CsvExportResult =
  | {
      ok: true
      filename: string
      rows: string[][]
      total: number
      truncated: boolean
    }
  | { ok: false; message: string }

export type ExportStatus = { tone: "error" | "info"; text: string } | null

/** Resultado de la Server Action de conteo previo (`ExportDialog`, abre y
 *  pide cuántas filas matchean los filtros ANTES de exportar) — mismo
 *  universo que `CsvExportResult.total`, pero sin traer filas. */
export type CsvPreviewResult =
  { ok: true; total: number } | { ok: false; message: string }

/** Precedencia compartida por `previewError` y `exportStatus`:
 *  `serverError` → copia fija del llamador, `validationErrors` → mensaje
 *  genérico, `data.ok === false` → mensaje propio de la action.
 *  `undefined` cuando el resultado fue exitoso (o todavía no llegó). */
function actionErrorText(
  result: {
    serverError?: string
    validationErrors?: unknown
    data?: { ok: boolean; message?: string }
  },
  fallbackError: string
): string | undefined {
  if (result.serverError) return fallbackError
  if (result.validationErrors) return "Filtros inválidos. Recarga la página."
  if (result.data?.ok === false) return result.data.message
  return undefined
}

/** Mensaje de error del preview de conteo, o `undefined` si fue exitoso —
 *  sin la rama de truncamiento de `exportStatus` (el preview no trae
 *  filas, así que no aplica). */
export function previewError(
  result: {
    serverError?: string
    validationErrors?: unknown
    data?: CsvPreviewResult
  },
  fallbackError: string
): string | undefined {
  return actionErrorText(result, fallbackError)
}

/**
 * Deriva el texto inline a mostrar junto al botón de export a partir del
 * `result` de `useAction` — mismo ternario de tres ramas repetido en varios
 * componentes del repo, más una rama extra para avisar de un export
 * truncado por `EXPORT_ROW_CAP`.
 */
export function exportStatus(
  result: {
    serverError?: string
    validationErrors?: unknown
    data?: CsvExportResult
  },
  fallbackError: string
): ExportStatus {
  const errorText = actionErrorText(result, fallbackError)
  if (errorText !== undefined) return { tone: "error", text: errorText }
  if (result.data?.ok === true && result.data.truncated) {
    return {
      tone: "info",
      text: `Exportadas las primeras ${formatNumber(EXPORT_ROW_CAP)} filas de ${formatNumber(result.data.total)}.`,
    }
  }
  return null
}
