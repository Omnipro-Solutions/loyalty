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

export function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

/** Descarga un CSV generado en el navegador — sin bucket de Storage en este proyecto, todo vive en memoria hasta el momento de la descarga. Las filas ya deben venir con cada celda pasada por `csvCell`. */
export function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([rows.map((r) => r.join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
