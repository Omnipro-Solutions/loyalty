import { createClient } from "@/lib/supabase/server"
import { formatCOP } from "@/lib/format"
import type { PromotionType } from "@/types/domain"

export type EstadoVigenciaPromocion =
  "borrador" | "programada" | "activa" | "finalizada"

export type PromocionRelacionada = {
  id: string
  nombre: string
  tipo: PromotionType
  mecanica: string
  vigenteDesde: string
  vigenteHasta: string | null
  estado: EstadoVigenciaPromocion
  alcance: string
}

type CondicionCruda = { campo?: string; valor?: unknown }

function condicionesDe(json: unknown): CondicionCruda[] {
  return Array.isArray(json) ? (json as CondicionCruda[]) : []
}

function soloFecha(valor: string): number {
  const d = new Date(valor)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Mismo cruce `estado_publicacion` + fechas que `features/promociones/lib/estado.ts` — duplicado a propósito, features aisladas (CLAUDE.md §2). */
function estadoVigencia(
  fila: {
    estado_publicacion: string
    vigente_desde: string
    vigente_hasta: string | null
  },
  ahora: Date = new Date()
): EstadoVigenciaPromocion {
  if (fila.estado_publicacion === "borrador") return "borrador"
  const hoy = soloFecha(ahora.toISOString())
  const desde = soloFecha(fila.vigente_desde)
  const hasta = fila.vigente_hasta ? soloFecha(fila.vigente_hasta) : null
  if (desde > hoy) return "programada"
  if (hasta !== null && hasta < hoy) return "finalizada"
  return "activa"
}

function mecanicaResumen(tipoBeneficio: string, valorBeneficio: number | null) {
  switch (tipoBeneficio) {
    case "descuento_porcentual":
      return `${valorBeneficio ?? 0} % de descuento`
    case "descuento_monto_fijo":
      return `${formatCOP(valorBeneficio ?? 0)} de descuento`
    case "envio_gratis":
      return "Envío gratis"
    case "producto_gratis":
      return "Producto gratis (2x1, 3x2…)"
    case "precio_fijo_bundle":
      return `Precio fijo: ${formatCOP(valorBeneficio ?? 0)}`
    default:
      return "—"
  }
}

/**
 * Promociones que afectan a un producto: las que restringen por categoría y
 * comparten alguna con las del producto, o las que no traen esa condición
 * (aplican a todo el catálogo, ej. tipo "carrito"/"cupon" globales).
 */
export async function listPromocionesPorCategorias(
  categoriaIds: string[],
  categoriaNombrePorId: Map<string, string>
): Promise<PromocionRelacionada[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select(
      "id, nombre, tipo, tipo_beneficio, valor_beneficio, vigente_desde, vigente_hasta, estado_publicacion, canal_aplicacion, condiciones, creado_en"
    )
    .neq("estado_publicacion", "borrador")
    .order("creado_en", { ascending: false })
  if (error) throw error

  return (data ?? [])
    .filter((fila) => {
      const condCategoria = condicionesDe(fila.condiciones).find(
        (c) => c.campo === "categoria"
      )
      if (!condCategoria || !Array.isArray(condCategoria.valor)) return true
      return (condCategoria.valor as string[]).some((id) =>
        categoriaIds.includes(id)
      )
    })
    .map((fila) => {
      const condCategoria = condicionesDe(fila.condiciones).find(
        (c) => c.campo === "categoria"
      )
      const valoresCategoria =
        condCategoria && Array.isArray(condCategoria.valor)
          ? (condCategoria.valor as string[])
          : null

      const alcance = valoresCategoria
        ? valoresCategoria
            .filter((id) => categoriaIds.includes(id))
            .map((id) => categoriaNombrePorId.get(id) ?? id)
            .join(", ") || "Categoría"
        : fila.canal_aplicacion === "pos"
          ? "Tiendas físicas"
          : fila.canal_aplicacion === "ecommerce"
            ? "E-commerce"
            : "Todo el catálogo"

      return {
        id: fila.id,
        nombre: fila.nombre,
        tipo: fila.tipo as PromotionType,
        mecanica: mecanicaResumen(fila.tipo_beneficio, fila.valor_beneficio),
        vigenteDesde: fila.vigente_desde,
        vigenteHasta: fila.vigente_hasta,
        estado: estadoVigencia(fila),
        alcance,
      }
    })
}
