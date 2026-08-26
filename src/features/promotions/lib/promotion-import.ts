import type { ParsedCsv } from "@/lib/csv"
import {
  BENEFIT_TYPES,
  CHANNEL_SCOPES,
  PROMOTION_TYPES,
  type BenefitType,
  type ChannelScope,
  type PromotionType,
} from "@/types/domain"

import {
  BENEFIT_TYPE_LABEL,
  CHANNEL_SCOPE_LABEL,
  PROMOTION_TYPE_LABEL,
} from "./labels"
import { createPromotionDefaults } from "./promotion-defaults"
import {
  promotionSchema,
  type ConditionGroupValues,
  type PromotionValues,
} from "../schemas"

/**
 * Solo las mecánicas que quedan completamente determinadas por un `valor`
 * escalar (verificado contra `refineByBenefitType` en `../schemas.ts`) —
 * las otras 7 exigen referencias a productos/emisiones o datos multi-fila
 * (escalones, límites obligatorios) que un CSV plano no puede cargar. Se
 * rechazan con un mensaje explícito, no a medias.
 */
export const IMPORTABLE_BENEFIT_TYPES = [
  "descuento_porcentual",
  "descuento_monto_fijo",
  "envio_gratis",
  "bono_puntos",
  "multiplicador_puntos",
] as const satisfies readonly BenefitType[]
export type ImportableBenefitType = (typeof IMPORTABLE_BENEFIT_TYPES)[number]

type ImportColumnSpec = {
  key: string
  label: string
  required: boolean
  hint: string
  example: string
}

/** Contrato del CSV — única fuente de verdad: alimenta la plantilla, el mapeo de columnas, el parseo por fila y el CSV de errores. */
export const PROMOTION_IMPORT_COLUMNS = [
  {
    key: "nombre",
    label: "nombre",
    required: true,
    hint: "Nombre de la promoción",
    example: "Verano 20%",
  },
  {
    key: "codigo",
    label: "codigo",
    required: true,
    hint: "Solo mayúsculas, números y guiones",
    example: "VERANO20",
  },
  {
    key: "tipo",
    label: "tipo",
    required: true,
    hint: "cantidad · categoria · segmento · carrito · cupon · bundle",
    example: "categoria",
  },
  {
    key: "mecanica",
    label: "mecanica",
    required: true,
    hint: "descuento_porcentual · descuento_monto_fijo · envio_gratis · bono_puntos · multiplicador_puntos",
    example: "descuento_porcentual",
  },
  {
    key: "valor",
    label: "valor",
    required: false,
    hint: "Requerido salvo en envío gratis",
    example: "20",
  },
  {
    key: "tope_maximo",
    label: "tope_maximo",
    required: false,
    hint: "Tope del beneficio, opcional",
    example: "",
  },
  {
    key: "desde",
    label: "desde",
    required: true,
    hint: "AAAA-MM-DD o DD/MM/AAAA",
    example: "2026-09-01",
  },
  {
    key: "hasta",
    label: "hasta",
    required: false,
    hint: "AAAA-MM-DD o DD/MM/AAAA",
    example: "2026-09-30",
  },
  {
    key: "prioridad",
    label: "prioridad",
    required: false,
    hint: "1 a 10, por defecto 5",
    example: "5",
  },
  {
    key: "presupuesto",
    label: "presupuesto",
    required: false,
    hint: "Presupuesto asignado, por defecto 0",
    example: "5000000",
  },
  {
    key: "acumulable",
    label: "acumulable",
    required: false,
    hint: "si/no, por defecto no",
    example: "no",
  },
  {
    key: "canal",
    label: "canal",
    required: false,
    hint: "pos · ecommerce · pos_ecommerce, por defecto pos_ecommerce",
    example: "pos_ecommerce",
  },
  {
    key: "cond_categorias",
    label: "cond_categorias",
    required: false,
    hint: "Nombres de categoría separados por |",
    example: "",
  },
  {
    key: "cond_ciudad",
    label: "cond_ciudad",
    required: false,
    hint: "Nombre de ciudad con tiendas",
    example: "",
  },
  {
    key: "cond_segmento",
    label: "cond_segmento",
    required: false,
    hint: "Nombre de la audiencia",
    example: "",
  },
  {
    key: "cond_monto_minimo",
    label: "cond_monto_minimo",
    required: false,
    hint: "Monto mínimo del carrito",
    example: "50000",
  },
] as const satisfies readonly ImportColumnSpec[]

/** Tope de filas por importación — acota el payload de la Server Action y el número de reintentos fila-por-fila en el peor caso. */
export const MAX_IMPORT_ROWS = 500

export type PromotionImportColumnKey =
  (typeof PROMOTION_IMPORT_COLUMNS)[number]["key"]
export type ColumnMapping = Partial<Record<PromotionImportColumnKey, number>>
export type RawImportRow = { rowNumber: number } & Record<
  PromotionImportColumnKey,
  string
>

// --- Normalización y heurística de mapeo de columnas ---------------------

/** minúsculas, sin acentos, espacios/guiones → `_` — mismo criterio para cabeceras de columna y valores de dominio (etiqueta o crudo, da igual cuál llegue). */
export function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

const HEADER_HINTS: Record<PromotionImportColumnKey, RegExp> = {
  nombre: /nombre|name/i,
  codigo: /codigo|código|^code$/i,
  tipo: /^tipo$|^type$/i,
  mecanica: /mecanica|mecánica|benefit/i,
  valor: /^valor$|^value$/i,
  tope_maximo: /tope|max.*cap/i,
  desde: /desde|inicio|from/i,
  hasta: /hasta|termina|until/i,
  prioridad: /prioridad|priority/i,
  presupuesto: /presupuesto|budget/i,
  acumulable: /acumulable|stackable/i,
  canal: /canal|channel/i,
  cond_categorias: /categor/i,
  cond_ciudad: /ciudad|city/i,
  cond_segmento: /segmento|segment|audiencia/i,
  cond_monto_minimo: /monto.*minimo|monto_carrito|carrito/i,
}

/** Heurística por nombre de columna — coincidencia exacta normalizada primero, luego regex por pista. Mismo criterio que `features/coupons/lib/csv-import.ts`. */
export function inferImportMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeToken)
  const mapping: ColumnMapping = {}
  for (const { key } of PROMOTION_IMPORT_COLUMNS) {
    let index = normalized.findIndex((h) => h === key)
    if (index < 0) index = headers.findIndex((h) => HEADER_HINTS[key].test(h))
    if (index >= 0) mapping[key] = index
  }
  return mapping
}

export function missingRequiredColumns(
  mapping: ColumnMapping
): PromotionImportColumnKey[] {
  return PROMOTION_IMPORT_COLUMNS.filter(
    (c) => c.required && mapping[c.key] === undefined
  ).map((c) => c.key)
}

export function mapImportRows(
  parsed: ParsedCsv,
  mapping: ColumnMapping
): RawImportRow[] {
  return parsed.rows.map((row, i) => {
    const entry = { rowNumber: i + 2 } as RawImportRow
    for (const { key } of PROMOTION_IMPORT_COLUMNS) {
      const index = mapping[key]
      entry[key] = index !== undefined ? (row[index]?.trim() ?? "") : ""
    }
    return entry
  })
}

export function buildTemplateCsv(): string[][] {
  return [
    PROMOTION_IMPORT_COLUMNS.map((c) => c.label),
    PROMOTION_IMPORT_COLUMNS.map((c) => c.example),
  ]
}

// --- Parsers laxos de celda -----------------------------------------------

/**
 * Acepta `1500000`, `1.500.000`, `1500000,50` y `1500000.50`. Si aparecen
 * los dos separadores, el que quede más a la derecha es el decimal. Con uno
 * solo: 1-2 dígitos después es el separador decimal, 3+ es agrupador de
 * miles (`1.500` → 1500, `12,5` → 12.5).
 */
export function parseLooseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[\s$ ]/g, "")
  if (cleaned === "" || !/^-?[\d.,]+$/.test(cleaned)) return undefined

  const lastComma = cleaned.lastIndexOf(",")
  const lastDot = cleaned.lastIndexOf(".")
  let normalized = cleaned

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIndex = Math.max(lastComma, lastDot)
    const integerPart = cleaned.slice(0, decimalIndex).replace(/[.,]/g, "")
    const fractionPart = cleaned.slice(decimalIndex + 1)
    normalized = `${integerPart}.${fractionPart}`
  } else if (lastComma >= 0) {
    const fractionLength = cleaned.length - lastComma - 1
    normalized =
      fractionLength <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "")
  } else if (lastDot >= 0) {
    const fractionLength = cleaned.length - lastDot - 1
    normalized = fractionLength <= 2 ? cleaned : cleaned.replace(/\./g, "")
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}

const TRUE_TOKENS = new Set(["si", "s", "yes", "true", "1", "x"])
const FALSE_TOKENS = new Set(["no", "n", "false", "0", ""])

export function parseLooseBoolean(raw: string, fallback: boolean): boolean {
  const token = normalizeToken(raw)
  if (TRUE_TOKENS.has(token)) return true
  if (FALSE_TOKENS.has(token)) return false
  return fallback
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DMY_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function isValidCalendarDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1) return false
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]
}

/**
 * Acepta `AAAA-MM-DD` (la plantilla) y `DD/MM/AAAA`. Devuelve siempre un
 * string ISO, nunca construye un `Date` — `new Date("01/09/2026")` en
 * UTC-5 puede volver al 31 de agosto (corrimiento de huso horario), un bug
 * silencioso que una fecha-string nunca puede tener.
 */
export function parseImportDate(raw: string): string | undefined {
  const trimmed = raw.trim()
  const iso = ISO_DATE.exec(trimmed)
  if (iso) {
    const [, y, m, d] = iso
    return isValidCalendarDate(Number(y), Number(m), Number(d))
      ? trimmed
      : undefined
  }
  const dmy = DMY_DATE.exec(trimmed)
  if (dmy) {
    const [, d, m, y] = dmy
    if (!isValidCalendarDate(Number(y), Number(m), Number(d))) return undefined
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  return undefined
}

export function parseMultiValue(raw: string): string[] {
  return raw
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean)
}

// --- Alias de dominio (valor crudo o etiqueta humana, cualquiera resuelve) ---

function buildAliasMap<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
  extra: Record<string, T> = {}
): Map<string, T> {
  const map = new Map<string, T>()
  for (const v of values) {
    map.set(normalizeToken(v), v)
    map.set(normalizeToken(labels[v]), v)
  }
  for (const [alias, v] of Object.entries(extra)) {
    map.set(normalizeToken(alias), v)
  }
  return map
}

function resolveAlias<T extends string>(
  map: Map<string, T>,
  raw: string
): T | undefined {
  return map.get(normalizeToken(raw))
}

const TIPO_ALIASES = buildAliasMap(PROMOTION_TYPES, PROMOTION_TYPE_LABEL)
const MECANICA_ALIASES = buildAliasMap(BENEFIT_TYPES, BENEFIT_TYPE_LABEL)
const CANAL_ALIASES = buildAliasMap(CHANNEL_SCOPES, CHANNEL_SCOPE_LABEL, {
  ambos: "pos_ecommerce",
  "pos+ecommerce": "pos_ecommerce",
})

// --- Catálogos para resolver nombre → id ----------------------------------

export type ImportCatalogs = {
  categoryIdByName: Map<string, string>
  segmentIdByName: Map<string, string>
  /** normalizado → nombre real (el que guarda `tiendas.ciudad`) */
  cityNameByToken: Map<string, string>
}

export function buildImportCatalogs(
  categories: { id: string; name: string }[],
  segments: { id: string; name: string }[],
  cities: { city: string }[]
): ImportCatalogs {
  return {
    categoryIdByName: new Map(
      categories.map((c) => [normalizeToken(c.name), c.id])
    ),
    segmentIdByName: new Map(
      segments.map((s) => [normalizeToken(s.name), s.id])
    ),
    cityNameByToken: new Map(
      cities.map((c) => [normalizeToken(c.city), c.city])
    ),
  }
}

// --- Duplicados de código dentro del archivo ------------------------------

/** Fila → número de la primera fila con el mismo `codigo` (normalizado mayúsculas+trim), para las filas repetidas. Vacíos se ignoran (ya son error de campo requerido). */
export function findDuplicateCodes(rows: RawImportRow[]): Map<number, number> {
  const firstSeenAt = new Map<string, number>()
  const duplicates = new Map<number, number>()
  for (const row of rows) {
    const code = row.codigo.trim().toUpperCase()
    if (!code) continue
    const seenAt = firstSeenAt.get(code)
    if (seenAt !== undefined) duplicates.set(row.rowNumber, seenAt)
    else firstSeenAt.set(code, row.rowNumber)
  }
  return duplicates
}

// --- Parseo + validación por fila -----------------------------------------

export type ImportRowError = {
  column: PromotionImportColumnKey | null
  message: string
}
export type ImportFailure = {
  rowNumber: number
  row: RawImportRow
  errors: ImportRowError[]
}
export type ImportReadyRow = { rowNumber: number; values: PromotionValues }

/** Traduce un `path` de `promotionSchema` (las reglas cruzadas de F12/S05/etc.) de vuelta a la columna del CSV que lo originó, para que el error se vea en la tabla de validación en la columna correcta. */
const SCHEMA_FIELD_TO_COLUMN: Partial<
  Record<string, PromotionImportColumnKey>
> = {
  name: "nombre",
  code: "codigo",
  type: "tipo",
  priority: "prioridad",
  stackable: "acumulable",
  channelScope: "canal",
  benefitType: "mecanica",
  benefitValue: "valor",
  maxCap: "tope_maximo",
  bonoPuntos: "valor",
  multiplicadorPuntos: "valor",
  validFrom: "desde",
  validUntil: "hasta",
  assignedBudget: "presupuesto",
}

function mapSchemaPathToColumn(
  path: readonly PropertyKey[]
): PromotionImportColumnKey | null {
  const first = path[0]
  return typeof first === "string"
    ? (SCHEMA_FIELD_TO_COLUMN[first] ?? null)
    : null
}

/**
 * Parsea y valida una fila cruda. Estrategia en dos fases: primero se
 * decodifican las celdas (números/fechas/enums laxos, con error de columna
 * si la celda no se puede interpretar); si todas decodifican, se arma un
 * `PromotionValues` completo con `createPromotionDefaults` y se valida con
 * el **`promotionSchema` real** — así el importador nunca reimplementa las
 * reglas cruzadas del wizard (rango de porcentaje, `hasta` > `desde`,
 * regex de código…), solo hereda cualquier cambio futuro en `schemas.ts`.
 */
export function parseImportRow(
  row: RawImportRow,
  catalogs: ImportCatalogs
):
  | { ok: true; values: PromotionValues }
  | { ok: false; errors: ImportRowError[] } {
  const errors: ImportRowError[] = []
  const err = (column: PromotionImportColumnKey, message: string) =>
    errors.push({ column, message })

  const nombre = row.nombre.trim()
  if (nombre.length < 3) {
    err("nombre", "Ingresa el nombre de la promoción (mín. 3 caracteres).")
  }

  const codigo = row.codigo.trim().toUpperCase()
  if (codigo.length < 3 || !/^[A-Z0-9-]+$/.test(codigo)) {
    err(
      "codigo",
      "El código debe tener al menos 3 caracteres: solo mayúsculas, números y guiones."
    )
  }

  const tipo: PromotionType | undefined = resolveAlias(TIPO_ALIASES, row.tipo)
  if (!tipo) err("tipo", `Tipo desconocido: "${row.tipo}".`)

  const mecanicaRaw = resolveAlias(MECANICA_ALIASES, row.mecanica)
  let mecanica: ImportableBenefitType | undefined
  if (!mecanicaRaw) {
    err("mecanica", `Mecánica desconocida: "${row.mecanica}".`)
  } else if (
    !(IMPORTABLE_BENEFIT_TYPES as readonly string[]).includes(mecanicaRaw)
  ) {
    err(
      "mecanica",
      `"${BENEFIT_TYPE_LABEL[mecanicaRaw]}" no se puede importar por CSV — créala desde el asistente.`
    )
  } else {
    mecanica = mecanicaRaw as ImportableBenefitType
  }

  const valorCell = row.valor.trim()
  let valor: number | undefined
  if (valorCell !== "") {
    valor = parseLooseNumber(valorCell)
    if (valor === undefined) {
      err("valor", `No se pudo interpretar "${valorCell}" como número.`)
    }
  }
  if (mecanica === "envio_gratis" && valorCell !== "") {
    err("valor", "«Envío gratis» no usa un valor — deja esta columna vacía.")
  } else if (mecanica && mecanica !== "envio_gratis" && valorCell === "") {
    err("valor", "Esta mecánica requiere un valor.")
  }

  const parseOptionalNumber = (
    raw: string,
    column: PromotionImportColumnKey
  ): number | undefined => {
    const cell = raw.trim()
    if (cell === "") return undefined
    const value = parseLooseNumber(cell)
    if (value === undefined) {
      err(column, `No se pudo interpretar "${cell}" como número.`)
    }
    return value
  }

  const topeMaximo = parseOptionalNumber(row.tope_maximo, "tope_maximo")
  const presupuesto = parseOptionalNumber(row.presupuesto, "presupuesto") ?? 0
  const prioridadRaw = parseOptionalNumber(row.prioridad, "prioridad")
  const prioridad = prioridadRaw !== undefined ? Math.round(prioridadRaw) : 5
  const montoMinimo = parseOptionalNumber(
    row.cond_monto_minimo,
    "cond_monto_minimo"
  )

  const desdeCell = row.desde.trim()
  let desde: string | undefined
  if (desdeCell === "") {
    err("desde", "Ingresa la fecha de inicio de vigencia.")
  } else {
    desde = parseImportDate(desdeCell)
    if (desde === undefined) {
      err(
        "desde",
        `No se pudo interpretar "${desdeCell}" como fecha (usa AAAA-MM-DD o DD/MM/AAAA).`
      )
    }
  }

  const hastaCell = row.hasta.trim()
  let hasta: string | undefined
  if (hastaCell !== "") {
    hasta = parseImportDate(hastaCell)
    if (hasta === undefined) {
      err("hasta", `No se pudo interpretar "${hastaCell}" como fecha.`)
    }
  }
  if (desde && hasta && hasta <= desde) {
    err("hasta", "Debe ser posterior a la fecha de inicio.")
  }

  const acumulable = parseLooseBoolean(row.acumulable, false)

  const canalCell = row.canal.trim()
  let canal: ChannelScope = "pos_ecommerce"
  if (canalCell !== "") {
    const resolved = resolveAlias(CANAL_ALIASES, canalCell)
    if (!resolved) err("canal", `Canal desconocido: "${canalCell}".`)
    else canal = resolved
  }

  const categoryNames = parseMultiValue(row.cond_categorias)
  const categoryIds: string[] = []
  for (const name of categoryNames) {
    const id = catalogs.categoryIdByName.get(normalizeToken(name))
    if (!id) err("cond_categorias", `No existe la categoría "${name}".`)
    else categoryIds.push(id)
  }

  const ciudadCell = row.cond_ciudad.trim()
  let ciudad: string | undefined
  if (ciudadCell !== "") {
    ciudad = catalogs.cityNameByToken.get(normalizeToken(ciudadCell))
    if (!ciudad) {
      err("cond_ciudad", `Ninguna tienda está en la ciudad "${ciudadCell}".`)
    }
  }

  const segmentoCell = row.cond_segmento.trim()
  let segmentoId: string | undefined
  if (segmentoCell !== "") {
    segmentoId = catalogs.segmentIdByName.get(normalizeToken(segmentoCell))
    if (!segmentoId) {
      err("cond_segmento", `No existe la audiencia "${segmentoCell}".`)
    }
  }

  if (errors.length > 0 || !tipo || !mecanica || desde === undefined) {
    return { ok: false, errors }
  }

  const conditions: ConditionGroupValues = {
    combinador: "todas",
    condiciones: [],
  }
  if (categoryIds.length > 0) {
    conditions.condiciones.push({ campo: "categoria", valor: categoryIds })
  }
  if (ciudad) conditions.condiciones.push({ campo: "tienda", valor: ciudad })
  if (segmentoId) {
    conditions.condiciones.push({ campo: "segmento", valor: segmentoId })
  }
  if (montoMinimo !== undefined) {
    conditions.condiciones.push({ campo: "monto_carrito", valor: montoMinimo })
  }

  const values: PromotionValues = {
    ...createPromotionDefaults(mecanica),
    name: nombre,
    code: codigo,
    type: tipo,
    priority: prioridad,
    stackable: acumulable,
    channelScope: canal,
    conditions,
    benefitValue: mecanica === "envio_gratis" ? undefined : valor,
    maxCap: topeMaximo,
    bonoPuntos: mecanica === "bono_puntos" ? valor : undefined,
    multiplicadorPuntos:
      mecanica === "multiplicador_puntos" ? valor : undefined,
    validFrom: desde,
    validUntil: hasta,
    assignedBudget: presupuesto,
    publicationStatus: "borrador",
  }

  const parsed = promotionSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        column: mapSchemaPathToColumn(issue.path),
        message: issue.message,
      })),
    }
  }

  return { ok: true, values: parsed.data }
}

// --- Orquestación (compartida entre la previsualización y la Server Action) ---

export type ImportBatchResult = {
  ready: ImportReadyRow[]
  failures: ImportFailure[]
}

export function validateImportBatch(
  rows: RawImportRow[],
  catalogs: ImportCatalogs
): ImportBatchResult {
  const duplicates = findDuplicateCodes(rows)
  const ready: ImportReadyRow[] = []
  const failures: ImportFailure[] = []

  for (const row of rows) {
    const duplicateOf = duplicates.get(row.rowNumber)
    if (duplicateOf !== undefined) {
      failures.push({
        rowNumber: row.rowNumber,
        row,
        errors: [
          {
            column: "codigo",
            message: `Código repetido en el archivo (ya aparece en la fila ${duplicateOf}).`,
          },
        ],
      })
      continue
    }
    const result = parseImportRow(row, catalogs)
    if (result.ok) {
      ready.push({ rowNumber: row.rowNumber, values: result.values })
    } else {
      failures.push({ rowNumber: row.rowNumber, row, errors: result.errors })
    }
  }

  return { ready, failures: failures.sort((a, b) => a.rowNumber - b.rowNumber) }
}

export function buildFailuresCsv(failures: ImportFailure[]): string[][] {
  const header = [
    ...PROMOTION_IMPORT_COLUMNS.map((c) => c.label),
    "fila",
    "columna",
    "motivo",
  ]
  const rows = failures.map((f) => [
    ...PROMOTION_IMPORT_COLUMNS.map((c) => f.row[c.key]),
    String(f.rowNumber),
    [...new Set(f.errors.map((e) => e.column ?? ""))].filter(Boolean).join("|"),
    f.errors.map((e) => e.message).join(" · "),
  ])
  return [header, ...rows]
}
