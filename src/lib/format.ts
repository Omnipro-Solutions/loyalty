/**
 * Formateo es-CO. La app no tiene i18n (es la única variante planeada), así
 * que estos formateadores se crean una sola vez y se reexportan en vez de
 * instanciar `Intl.*` en cada render.
 */

const moneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const numero = new Intl.NumberFormat("es-CO")

const porcentaje = new Intl.NumberFormat("es-CO", {
  style: "percent",
  maximumFractionDigits: 1,
})

const fecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
})
const fechaLarga = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
})
const mesAnio = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  year: "numeric",
})
const fechaHora = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const horaCorta = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

export function formatCOP(valor: number): string {
  return moneda.format(valor)
}

export function formatNumero(valor: number): string {
  return numero.format(valor)
}

/** @param valor fracción (0.18), no el número entero de porcentaje (18). */
export function formatPorcentaje(valor: number): string {
  return porcentaje.format(valor)
}

/** `formatPorcentaje` ya antepone "-" a los negativos (Intl) pero no "+" a los positivos — esta sí, para que el signo sea explícito en deltas/variaciones. */
export function formatDeltaPorcentaje(valor: number): string {
  return `${valor >= 0 ? "+" : ""}${formatPorcentaje(valor)}`
}

export function formatFecha(valor: string | Date): string {
  return fecha.format(typeof valor === "string" ? new Date(valor) : valor)
}

/** "14 de marzo de 1991" (05.3g "Nacimiento") — mes en formato largo. */
export function formatFechaLarga(valor: string | Date): string {
  return fechaLarga.format(typeof valor === "string" ? new Date(valor) : valor)
}

/** "mar 2023" (05.3g "Tienda" — tienda + mes/año de inscripción). */
export function formatMesAnio(valor: string | Date): string {
  return mesAnio.format(typeof valor === "string" ? new Date(valor) : valor)
}

export function formatFechaHora(valor: string | Date): string {
  return fechaHora.format(typeof valor === "string" ? new Date(valor) : valor)
}

/** Iniciales para avatares: primera letra del primer y segundo nombre ("Elena Martínez" → "EM"). */
export function formatIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

const MESES_CORTOS = [
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
 * Bitácora de cambios"). No reusa `formatFecha`: en es-CO con mes corto,
 * `Intl.DateTimeFormat` de este runtime intercala "de" ("18 de ago de
 * 2026"), que no cabe en la columna de fecha de una sola línea del timeline.
 */
export function formatFechaEvento(valor: string | Date): string {
  const objetivo = typeof valor === "string" ? new Date(valor) : valor
  const ahora = new Date()
  const inicioHoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  )
  const inicioObjetivo = new Date(
    objetivo.getFullYear(),
    objetivo.getMonth(),
    objetivo.getDate()
  )
  const diasAtras = Math.round(
    (inicioHoy.getTime() - inicioObjetivo.getTime()) / 86_400_000
  )
  const hora = horaCorta.format(objetivo)
  if (diasAtras === 0) return `Hoy · ${hora}`
  if (diasAtras === 1) return `Ayer · ${hora}`
  const dia = String(objetivo.getDate()).padStart(2, "0")
  const mes = MESES_CORTOS[objetivo.getMonth()]
  return `${dia} ${mes} ${objetivo.getFullYear()} · ${hora}`
}

const relativo = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" })

/** "guardado hace 2 min" (editor bar del Loyalty Builder, 08.1). */
export function formatTiempoRelativo(valor: string | Date): string {
  const fecha = typeof valor === "string" ? new Date(valor) : valor
  const segundos = Math.round((fecha.getTime() - Date.now()) / 1000)
  const abs = Math.abs(segundos)

  if (abs < 60) return relativo.format(segundos, "second")
  if (abs < 3600) return relativo.format(Math.round(segundos / 60), "minute")
  if (abs < 86400) return relativo.format(Math.round(segundos / 3600), "hour")
  if (abs < 2592000) return relativo.format(Math.round(segundos / 86400), "day")
  return relativo.format(Math.round(segundos / 2592000), "month")
}
