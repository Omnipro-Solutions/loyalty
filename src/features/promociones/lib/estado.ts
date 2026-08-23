import type { EstadoPublicacionPromocion } from "@/types/domain"

export type EstadoVigenciaPromocion = "activa" | "programada" | "finalizada"

/** Día calendario en UTC como entero comparable — evita que la hora del día o la zona horaria muevan el límite. */
function soloFecha(valor: string | Date): number {
  const d = typeof valor === "string" ? new Date(valor) : valor
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Se cruza `estado_publicacion` con las fechas en vez de guardarse aparte — evita que quede desincronizado. */
export function estadoPromocion(
  promocion: {
    estado_publicacion: string
    vigente_desde: string
    vigente_hasta: string | null
  },
  ahora: Date = new Date()
): EstadoPublicacionPromocion | EstadoVigenciaPromocion {
  if (promocion.estado_publicacion === "borrador") return "borrador"
  const hoy = soloFecha(ahora)
  const desde = soloFecha(promocion.vigente_desde)
  const hasta = promocion.vigente_hasta
    ? soloFecha(promocion.vigente_hasta)
    : null
  if (desde > hoy) return "programada"
  if (hasta !== null && hasta < hoy) return "finalizada"
  return "activa"
}

/** "Vence hoy" / "Vence en N días" / "Permanente" (06.1, tarjetas superiores). */
export function vigenciaResumen(
  promocion: { vigente_hasta: string | null },
  ahora: Date = new Date()
): string {
  if (!promocion.vigente_hasta) return "Permanente"
  const dias = Math.round(
    (soloFecha(promocion.vigente_hasta) - soloFecha(ahora)) / 86_400_000
  )
  if (dias < 0) return "Vencida"
  if (dias === 0) return "Vence hoy"
  if (dias === 1) return "Vence en 1 día"
  return `Vence en ${dias} días`
}
