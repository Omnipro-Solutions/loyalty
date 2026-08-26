import { addDays, startOfDay, subDays, subYears } from "date-fns"

/**
 * Lógica pura de rango de fechas para el filtro de vigencia de "Panel de
 * promociones" — recorte de `features/dashboard/lib/filters.ts` (aislado
 * por feature, CLAUDE.md §2): sin `bucketize`/`comparisonWindow` porque no
 * hay serie de tiempo real detrás (`canjes`/`presupuesto_consumido` son
 * contadores por fila, no eventos con fecha — ver `queries.ts`). Lo único
 * que existe con fecha real es la vigencia (`vigente_desde`/`vigente_hasta`),
 * así que el rango filtra "promociones vigentes en esta ventana", no
 * "eventos ocurridos en esta ventana".
 */

export const DASHBOARD_VIGENCIA_RANGES = ["7d", "30d", "90d", "12m"] as const
export type DashboardVigenciaRange = (typeof DASHBOARD_VIGENCIA_RANGES)[number]
export const DEFAULT_VIGENCIA_RANGE = "todo"

export function isVigenciaRange(
  value: string | undefined
): value is DashboardVigenciaRange {
  return (
    !!value && (DASHBOARD_VIGENCIA_RANGES as readonly string[]).includes(value)
  )
}

export type DateWindow = { from: Date; to: Date }

/** `yyyy-MM-dd` en fecha local — mismo criterio que `toDateParam` de `features/dashboard/lib/filters.ts` (evita el corrimiento de `toISOString` en husos negativos). */
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
 * Resuelve la ventana de vigencia activa a partir de los searchParams.
 * `undefined` significa "todas las vigencias" (sin filtro) — es el default:
 * angostar por fecha es una decisión explícita del usuario, no algo que
 * oculte promociones al cargar la página por primera vez.
 */
export function resolveVigenciaWindow(params: {
  rango?: string
  desde?: string
  hasta?: string
}): DateWindow | undefined {
  const desde = parseDateParam(params.desde)
  const hasta = parseDateParam(params.hasta)
  if (desde && hasta && desde <= hasta) {
    return { from: startOfDay(desde), to: addDays(startOfDay(hasta), 1) }
  }

  if (!isVigenciaRange(params.rango)) return undefined
  const to = addDays(startOfDay(new Date()), 1)
  if (params.rango === "12m") return { from: subYears(to, 1), to }
  const days = params.rango === "90d" ? 90 : params.rango === "7d" ? 7 : 30
  return { from: subDays(to, days), to }
}

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

function dayLabel(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

/** "15 jul – 13 ago 2026" — misma forma que `formatWindowLabel` de `features/dashboard`. */
export function formatWindowLabel(window: DateWindow): string {
  const from = window.from
  const to = subDays(window.to, 1)
  return `${dayLabel(from)} – ${dayLabel(to)} ${to.getFullYear()}`
}
