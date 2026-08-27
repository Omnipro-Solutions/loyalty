/**
 * es-CO formatting. The app has no i18n (it's the only planned variant), so
 * these formatters are created once and re-exported instead of instantiating
 * `Intl.*` on every render.
 */

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const currencyCompact = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

const number = new Intl.NumberFormat("es-CO")

const percent = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 1,
})

const date = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
})
const longDate = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
})
const monthYear = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  year: "numeric",
})
const dateTime = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const shortTime = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

export function formatUSD(value: number): string {
  return currency.format(value)
}

/** Ej. "US$26,1 M" — para espacios angostos (KPI cards) donde el formato completo desborda. */
export function formatUSDCompact(value: number): string {
  return currencyCompact.format(value)
}

export function formatNumber(value: number): string {
  return number.format(value)
}

/** @param value fraction (0.18), not the whole percent number (18). */
export function formatPercent(value: number): string {
  return percent.format(value)
}

/** `formatPercent` already prepends "-" to negatives (Intl) but not "+" to positives — this one does, so the sign is explicit in deltas/variations. */
export function formatDeltaPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatPercent(value)}`
}

export function formatDate(value: string | Date): string {
  return date.format(typeof value === "string" ? new Date(value) : value)
}

/** "14 de marzo de 1991" (05.3g "Nacimiento") — long month format. */
export function formatLongDate(value: string | Date): string {
  return longDate.format(typeof value === "string" ? new Date(value) : value)
}

/** "mar 2023" (05.3g "Tienda" — store + enrollment month/year). */
export function formatMonthYear(value: string | Date): string {
  return monthYear.format(typeof value === "string" ? new Date(value) : value)
}

export function formatDateTime(value: string | Date): string {
  return dateTime.format(typeof value === "string" ? new Date(value) : value)
}

/** Avatar initials: first letter of first and second name ("Elena Martínez" → "EM"). */
export function formatInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
}

/** "482 B" / "12.4 KB" — tamaño de archivo para previsualizaciones de upload. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

const SHORT_MONTHS = [
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

/**
 * "Hoy · 09:14" / "Ayer · 17:41" / "18 ago 2026 · 11:20" (03.3 "Card ·
 * Bitácora de cambios"). Doesn't reuse `formatDate`: in es-CO with a short
 * month, this runtime's `Intl.DateTimeFormat` inserts "de" ("18 de ago de
 * 2026"), which doesn't fit the timeline's single-line date column.
 */
export function formatEventDate(value: string | Date): string {
  const target = typeof value === "string" ? new Date(value) : value
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  )
  const daysAgo = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / 86_400_000
  )
  const time = shortTime.format(target)
  if (daysAgo === 0) return `Hoy · ${time}`
  if (daysAgo === 1) return `Ayer · ${time}`
  const day = String(target.getDate()).padStart(2, "0")
  const month = SHORT_MONTHS[target.getMonth()]
  return `${day} ${month} ${target.getFullYear()} · ${time}`
}

/** "22 ago 2026" (05.3g "Audiencias activas"/"Promociones activas") — corto, sin los "de" que `formatDate` inserta en este runtime con mes abreviado. */
export function formatShortDate(value: string | Date): string {
  const target = typeof value === "string" ? new Date(value) : value
  const day = String(target.getDate()).padStart(2, "0")
  const month = SHORT_MONTHS[target.getMonth()]
  return `${day} ${month} ${target.getFullYear()}`
}

/** "09:40" (05.3g "Audiencias activas" — hora de la última sincronización). */
export function formatTime(value: string | Date): string {
  return shortTime.format(typeof value === "string" ? new Date(value) : value)
}

const relative = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" })

/** "guardado hace 2 min" (Loyalty Builder editor bar, 08.1). */
export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)

  if (abs < 60) return relative.format(seconds, "second")
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute")
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour")
  if (abs < 2592000) return relative.format(Math.round(seconds / 86400), "day")
  return relative.format(Math.round(seconds / 2592000), "month")
}
