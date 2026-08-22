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
const fechaHora = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
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

export function formatFecha(valor: string | Date): string {
  return fecha.format(typeof valor === "string" ? new Date(valor) : valor)
}

export function formatFechaHora(valor: string | Date): string {
  return fechaHora.format(typeof valor === "string" ? new Date(valor) : valor)
}

/** Iniciales para avatares: primera letra del primer y segundo nombre ("Elena Martínez" → "EM"). */
export function formatIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}
