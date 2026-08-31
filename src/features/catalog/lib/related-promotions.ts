import { createClient } from "@/lib/supabase/server"
import { formatUSD } from "@/lib/format"
import type { PromotionType } from "@/types/domain"

export type PromotionValidityStatus =
  "borrador" | "programada" | "activa" | "inactiva" | "finalizada"

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
type RawConditionNode =
  RawCondition | { combinador?: string; condiciones?: RawConditionNode[] }

/**
 * `promociones.condiciones` es un árbol de grupos Y/O anidados (ver
 * `features/promotions/lib/condition-tree.ts`), no un array plano —
 * aplana recursivamente para recolectar todas las hojas, sin importar en
 * qué subgrupo estén. Copia mínima duplicada por aislamiento entre
 * features (CLAUDE.md §2).
 */
function conditionsOf(json: unknown): RawCondition[] {
  if (!json || typeof json !== "object") return []
  const node = json as RawConditionNode
  if ("condiciones" in node && Array.isArray(node.condiciones)) {
    return node.condiciones.flatMap(conditionsOf)
  }
  return [node as RawCondition]
}

function dateOnly(value: string): number {
  const d = new Date(value)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Mismo cruce `estado_publicacion` + fechas que `features/promotions/lib/status.ts` — duplicado a propósito, features aisladas (CLAUDE.md §2). */
function validityStatus(
  row: {
    estado_publicacion: string
    vigente_desde: string
    vigente_hasta: string | null
  },
  now: Date = new Date()
): PromotionValidityStatus {
  // Solo 'activa' se cruza con las fechas — el resto son decisiones
  // explícitas del operador y se muestran tal cual.
  if (row.estado_publicacion !== "activa") {
    return row.estado_publicacion as PromotionValidityStatus
  }
  const today = dateOnly(now.toISOString())
  const from = dateOnly(row.vigente_desde)
  const to = row.vigente_hasta ? dateOnly(row.vigente_hasta) : null
  if (from > today) return "programada"
  if (to !== null && to < today) return "finalizada"
  return "activa"
}

type MechanicSummaryRow = {
  tipo_beneficio: string
  valor_beneficio: number | null
  compra_cantidad: number | null
  paga_cantidad: number | null
  multiplicador_puntos: number | null
  bono_puntos: number | null
  precio_promocional: number | null
  tipo_monedero: string | null
}

/**
 * `tipo_beneficio` es `string` (no `BenefitType`) para no acoplar esta
 * query a `@/types/domain` — su `switch` NO avisa en el typecheck si se
 * agrega una mecánica nueva sin tocar aquí (a diferencia de
 * `BENEFIT_TYPE_LABEL`, que sí es `Record<BenefitType,…>`), así que cada
 * mecánica nueva de `features/promotions` necesita agregarse a mano.
 */
function mechanicSummary(row: MechanicSummaryRow) {
  switch (row.tipo_beneficio) {
    case "descuento_porcentual":
      return `${row.valor_beneficio ?? 0} % de descuento`
    case "descuento_monto_fijo":
      return `${formatUSD(row.valor_beneficio ?? 0)} de descuento`
    case "envio_gratis":
      return "Envío gratis"
    case "producto_gratis":
      return "Producto gratis (2x1, 3x2…)"
    case "precio_fijo_bundle":
      return `Precio fijo: ${formatUSD(row.valor_beneficio ?? 0)}`
    case "descuento_escalonado":
      return "Descuento escalonado por tramos"
    case "por_piezas":
      return `Compra ${row.compra_cantidad ?? "?"}, paga ${row.paga_cantidad ?? "?"}`
    case "multiplicador_puntos":
      return `${row.multiplicador_puntos ?? "?"}x puntos`
    case "bono_puntos":
      return `+${row.bono_puntos ?? "?"} puntos de bono`
    case "emitir_cupon":
      return "Emite un cupón"
    case "precio_especial":
      return `Precio especial: ${formatUSD(row.precio_promocional ?? 0)}`
    case "cashback":
      return row.tipo_monedero === "monto_fijo"
        ? `Cashback: ${formatUSD(row.valor_beneficio ?? 0)}`
        : `Cashback: ${row.valor_beneficio ?? 0} %`
    case "descuento_continuidad":
      return "Descuento por continuidad de compra"
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
      "id, nombre, tipo, tipo_beneficio, valor_beneficio, compra_cantidad, paga_cantidad, multiplicador_puntos, bono_puntos, precio_promocional, tipo_monedero, vigente_desde, vigente_hasta, estado_publicacion, canal_aplicacion, condiciones, creado_en"
    )
    // Ni borrador ni pendiente_aprobacion: una promoción esperando
    // aprobación no está publicada — mostrarla en la ficha del producto
    // sería filtrar un cambio que todavía nadie autorizó.
    .in("estado_publicacion", ["activa", "inactiva", "finalizada"])
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
        mechanic: mechanicSummary(row),
        validFrom: row.vigente_desde,
        validTo: row.vigente_hasta,
        status: validityStatus(row),
        scope,
      }
    })
}
