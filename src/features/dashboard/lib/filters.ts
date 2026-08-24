import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  max as dateMax,
  min as dateMin,
  startOfDay,
  startOfMonth,
  subDays,
  subYears,
} from "date-fns"

/**
 * Lógica pura (sin Supabase) de rango de fechas para los filtros de
 * `/analitica`. Usada tanto por la barra de filtros (cliente, para derivar la
 * etiqueta y el pill activo) como por `queries.ts` (servidor, para las
 * consultas) — una sola fuente de verdad para que ambos nunca se desincronicen.
 */

export const DASHBOARD_RANGES = ["7d", "30d", "90d", "12m"] as const
export type DashboardRange = (typeof DASHBOARD_RANGES)[number]
export const DEFAULT_RANGE: DashboardRange = "30d"

export const COMPARISON_MODES = ["anterior", "ano_anterior"] as const
export type ComparisonMode = (typeof COMPARISON_MODES)[number]
export const DEFAULT_COMPARISON: ComparisonMode = "anterior"

export const COMPARISON_LABEL: Record<ComparisonMode, string> = {
  anterior: "Periodo anterior",
  ano_anterior: "Mismo periodo año anterior",
}

/** Nombres de mes cortos en español, capitalizados — mismo valor que usaban `queries.ts`/`lastMonths`, movido aquí para no duplicarlo. */
export const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

/** Ventana semiabierta [from, to). */
export type DateWindow = { from: Date; to: Date }

export type BucketUnit = "dia" | "semana" | "mes"
export type Bucket = { key: string; label: string; from: Date; to: Date }

export function isDashboardRange(
  value: string | undefined
): value is DashboardRange {
  return !!value && (DASHBOARD_RANGES as readonly string[]).includes(value)
}

export function isComparisonMode(
  value: string | undefined
): value is ComparisonMode {
  return !!value && (COMPARISON_MODES as readonly string[]).includes(value)
}

function dayLabel(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()].toLowerCase()}`
}

/** `yyyy-MM-dd` en fecha local, no UTC — evita el corrimiento de un día que da `toISOString`/`parseISO` en husos negativos como America/Bogota. */
export function toDateParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseDateParam(value: string | undefined): Date | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Resuelve la ventana activa. Fechas explícitas (`desde`/`hasta`) ganan sobre
 * el rango rápido; si sólo una es válida o `desde` no es anterior a `hasta`,
 * se ignoran ambas y se cae al rango — nunca lanza, una URL escrita a mano no
 * puede tumbar el dashboard.
 */
export function resolveWindow(params: {
  rango?: string
  desde?: string
  hasta?: string
}): DateWindow {
  const desde = parseDateParam(params.desde)
  const hasta = parseDateParam(params.hasta)
  if (desde && hasta && desde <= hasta) {
    return { from: startOfDay(desde), to: addDays(startOfDay(hasta), 1) }
  }

  const rango = isDashboardRange(params.rango) ? params.rango : DEFAULT_RANGE
  const to = addDays(startOfDay(new Date()), 1)
  if (rango === "12m") return { from: startOfMonth(subYears(to, 1)), to }
  const days = rango === "90d" ? 90 : rango === "7d" ? 7 : 30
  return { from: subDays(to, days), to }
}

/** Ventana de comparación: misma duración inmediatamente anterior, o la misma ventana un año atrás. */
export function comparisonWindow(
  window: DateWindow,
  mode: ComparisonMode
): DateWindow {
  if (mode === "ano_anterior") {
    return { from: subYears(window.from, 1), to: subYears(window.to, 1) }
  }
  const lengthMs = window.to.getTime() - window.from.getTime()
  return { from: new Date(window.from.getTime() - lengthMs), to: window.from }
}

/**
 * Granularidad adaptativa: día para ventanas cortas, semana para medias, mes
 * para largas — así "Canjes por mes" no pinta 30 columnas vacías con un rango
 * de 7 días. Umbrales ajustados a la densidad de los datos demo, no una ley
 * universal. Siempre devuelve al menos 1 bucket.
 */
export function bucketize(window: DateWindow): {
  unit: BucketUnit
  buckets: Bucket[]
} {
  const days = differenceInCalendarDays(window.to, window.from)
  const lastDay = subDays(window.to, 1)

  if (days <= 14) {
    const buckets = eachDayOfInterval({ start: window.from, end: lastDay }).map(
      (d) => ({
        key: toDateParam(d),
        label: dayLabel(d),
        from: d,
        to: addDays(d, 1),
      })
    )
    return { unit: "dia", buckets }
  }

  if (days <= 92) {
    const starts = eachWeekOfInterval(
      { start: window.from, end: lastDay },
      { weekStartsOn: 1 }
    )
    const buckets = starts.map((weekStart) => {
      const from = dateMax([weekStart, window.from])
      const to = dateMin([addDays(weekStart, 7), window.to])
      return { key: toDateParam(from), label: dayLabel(from), from, to }
    })
    return { unit: "semana", buckets }
  }

  const starts = eachMonthOfInterval({ start: window.from, end: lastDay })
  const buckets = starts.map((monthStart) => {
    const from = dateMax([startOfMonth(monthStart), window.from])
    const to = dateMin([addMonths(startOfMonth(monthStart), 1), window.to])
    return {
      key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
      label: MONTHS[monthStart.getMonth()],
      from,
      to,
    }
  })
  return { unit: "mes", buckets }
}

export const BUCKET_UNIT_LABEL: Record<BucketUnit, string> = {
  dia: "día",
  semana: "semana",
  mes: "mes",
}

const BUCKET_UNIT_GENDER: Record<BucketUnit, "m" | "f"> = {
  dia: "m",
  semana: "f",
  mes: "m",
}

/** "últimos 7 días" / "últimas 5 semanas" / "últimos 12 meses" — para captions que hoy dicen "últimos 4 meses" fijo. */
export function describeBucketCount(
  buckets: Bucket[],
  unit: BucketUnit
): string {
  const n = buckets.length
  const plural: Record<BucketUnit, string> = {
    dia: "días",
    semana: "semanas",
    mes: "meses",
  }
  const noun = n === 1 ? BUCKET_UNIT_LABEL[unit] : plural[unit]
  const prefix =
    BUCKET_UNIT_GENDER[unit] === "f"
      ? n === 1
        ? "última"
        : "últimas"
      : n === 1
        ? "último"
        : "últimos"
  return `${prefix} ${n} ${noun}`
}

/** "15 jul – 13 ago 2026" — reemplaza la etiqueta hardcodeada del chip de fechas. */
export function formatWindowLabel(window: DateWindow): string {
  const from = window.from
  const to = subDays(window.to, 1)
  return `${dayLabel(from)} – ${dayLabel(to)} ${to.getFullYear()}`
}
