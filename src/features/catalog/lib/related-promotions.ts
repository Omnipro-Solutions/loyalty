import { createClient } from "@/lib/supabase/server"
import { formatCOP } from "@/lib/format"
import type { PromotionType } from "@/types/domain"

export type PromotionValidityStatus =
  "borrador" | "programada" | "activa" | "finalizada"

export type RelatedPromotion = {
  id: string
  name: string
  type: PromotionType
  mechanic: string
  validFrom: string
  validTo: string | null
  status: PromotionValidityStatus
  scope: string
}

type RawCondition = { campo?: string; valor?: unknown }

function conditionsOf(json: unknown): RawCondition[] {
  return Array.isArray(json) ? (json as RawCondition[]) : []
}

function dateOnly(value: string): number {
  const d = new Date(value)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Mismo cruce `estado_publicacion` + fechas que `features/promociones/lib/estado.ts` — duplicado a propósito, features aisladas (CLAUDE.md §2). */
function validityStatus(
  row: {
    estado_publicacion: string
    vigente_desde: string
    vigente_hasta: string | null
  },
  now: Date = new Date()
): PromotionValidityStatus {
  if (row.estado_publicacion === "borrador") return "borrador"
  const today = dateOnly(now.toISOString())
  const from = dateOnly(row.vigente_desde)
  const to = row.vigente_hasta ? dateOnly(row.vigente_hasta) : null
  if (from > today) return "programada"
  if (to !== null && to < today) return "finalizada"
  return "activa"
}

function mechanicSummary(benefitType: string, benefitValue: number | null) {
  switch (benefitType) {
    case "descuento_porcentual":
      return `${benefitValue ?? 0} % de descuento`
    case "descuento_monto_fijo":
      return `${formatCOP(benefitValue ?? 0)} de descuento`
    case "envio_gratis":
      return "Envío gratis"
    case "producto_gratis":
      return "Producto gratis (2x1, 3x2…)"
    case "precio_fijo_bundle":
      return `Precio fijo: ${formatCOP(benefitValue ?? 0)}`
    default:
      return "—"
  }
}

/**
 * Promociones que afectan a un producto: las que restringen por categoría y
 * comparten alguna con las del producto, o las que no traen esa condición
 * (aplican a todo el catálogo, ej. tipo "carrito"/"cupon" globales).
 */
export async function listPromotionsByCategories(
  categoryIds: string[],
  categoryNameById: Map<string, string>
): Promise<RelatedPromotion[]> {
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
    .filter((row) => {
      const categoryCondition = conditionsOf(row.condiciones).find(
        (c) => c.campo === "categoria"
      )
      if (!categoryCondition || !Array.isArray(categoryCondition.valor))
        return true
      return (categoryCondition.valor as string[]).some((id) =>
        categoryIds.includes(id)
      )
    })
    .map((row) => {
      const categoryCondition = conditionsOf(row.condiciones).find(
        (c) => c.campo === "categoria"
      )
      const categoryValues =
        categoryCondition && Array.isArray(categoryCondition.valor)
          ? (categoryCondition.valor as string[])
          : null

      const scope = categoryValues
        ? categoryValues
            .filter((id) => categoryIds.includes(id))
            .map((id) => categoryNameById.get(id) ?? id)
            .join(", ") || "Categoría"
        : row.canal_aplicacion === "pos"
          ? "Tiendas físicas"
          : row.canal_aplicacion === "ecommerce"
            ? "E-commerce"
            : "Todo el catálogo"

      return {
        id: row.id,
        name: row.nombre,
        type: row.tipo as PromotionType,
        mechanic: mechanicSummary(row.tipo_beneficio, row.valor_beneficio),
        validFrom: row.vigente_desde,
        validTo: row.vigente_hasta,
        status: validityStatus(row),
        scope,
      }
    })
}
