import { formatUSD } from "@/lib/format"
import type { ConditionField, ConditionFieldDomain } from "@/types/domain"

import { CONDITION_FIELD_DOMAIN, CONDITION_FIELD_SHORT_LABEL } from "./labels"
import type { Condition, ConditionNode } from "./queries"

/** Mismo criterio estructural que `flattenConditionTree` de `lib/condition-tree.ts`, redeclarado por ser server-only (ver `collision.ts`). */
function flattenConditionNode(node: ConditionNode): Condition[] {
  if ("condiciones" in node)
    return node.condiciones.flatMap(flattenConditionNode)
  return [node]
}

type PromotionScope = {
  tipo: string
  canal_aplicacion: string
  condiciones: ConditionNode
}

type ScopeContext = {
  totalStores: number
  categoryNameById: Map<string, string>
  segmentNameById: Map<string, string>
}

/**
 * Resumen de a quién/dónde aplica una promoción (06.1 "ALCANCE": "E-commerce",
 * "42 tiendas", "Segmento VIP"…) — se computa desde `condiciones`/`canal_aplicacion`
 * en vez de guardarse aparte, para que nunca quede desincronizado con la condición real.
 */
export function scopeSummary(
  promotion: PromotionScope,
  ctx: ScopeContext
): string {
  const conditions = flattenConditionNode(promotion.condiciones)
  const segment = conditions.find((c) => c.campo === "segmento")
  if (segment) {
    return `Segmento ${ctx.segmentNameById.get(segment.valor) ?? segment.valor}`
  }

  const category = conditions.find((c) => c.campo === "categoria")
  if (category) {
    const names = category.valor.map((id) => ctx.categoryNameById.get(id) ?? id)
    return names.join(", ") || "—"
  }

  const store = conditions.find((c) => c.campo === "tienda")
  if (store) return store.valor

  const cartAmount = conditions.find((c) => c.campo === "monto_carrito")
  if (cartAmount) return `Carrito ≥ ${formatUSD(cartAmount.valor)}`

  const couponCode = conditions.find((c) => c.campo === "cupon_codigo")
  if (couponCode) return "Requiere código"

  if (promotion.canal_aplicacion === "pos") return "Tiendas físicas"
  if (promotion.canal_aplicacion === "ecommerce") return "E-commerce"
  if (promotion.tipo === "cantidad") return `${ctx.totalStores} tiendas`
  return "Todos"
}

/**
 * Color de la etiqueta por ámbito de la condición — el color dice DE QUÉ
 * habla la condición (producto, tienda, cliente…), así que dos condiciones
 * del mismo ámbito se leen como un grupo sin tener que leerlas. Reusa la
 * paleta `avatar-*`, la misma de `PROMOTION_TYPE_COLOR`.
 */
export const CONDITION_DOMAIN_COLOR: Record<
  ConditionFieldDomain,
  { bg: string; fg: string }
> = {
  Carrito: { bg: "bg-avatar-coral-bg", fg: "text-avatar-coral-fg" },
  Producto: { bg: "bg-avatar-indigo-bg", fg: "text-avatar-indigo-fg" },
  Tienda: { bg: "bg-avatar-teal-bg", fg: "text-avatar-teal-fg" },
  Cliente: { bg: "bg-avatar-violet-bg", fg: "text-avatar-violet-fg" },
  Cupón: { bg: "bg-avatar-amber-bg", fg: "text-avatar-amber-fg" },
}

export type ScopeTag = {
  campo: ConditionField
  domain: ConditionFieldDomain
  /** Nombre corto de la condición — lo que se ve en la etiqueta. */
  label: string
}

/**
 * Las condiciones de la promoción como etiquetas, una por campo distinto y
 * en el orden en que aparecen en el árbol. Devuelve el NOMBRE de la
 * condición (no su valor): la columna ALCANCE responde "por qué está
 * acotada", y el valor concreto se ve en el árbol del hover.
 *
 * Se deduplica por campo: tres condiciones de categoría en distintos grupos
 * son una sola etiqueta "Categoría" — repetirla tres veces no aporta nada
 * en 130px de ancho.
 */
export function scopeTags(promotion: PromotionScope): ScopeTag[] {
  const seen = new Set<ConditionField>()
  const tags: ScopeTag[] = []
  for (const condition of flattenConditionNode(promotion.condiciones)) {
    if (seen.has(condition.campo)) continue
    seen.add(condition.campo)
    tags.push({
      campo: condition.campo,
      domain: CONDITION_FIELD_DOMAIN[condition.campo],
      label: CONDITION_FIELD_SHORT_LABEL[condition.campo],
    })
  }
  return tags
}

/** Subtítulo de 06.1 ("Cantidad · todas las tiendas", "Cupón · nuevos clientes"…) — segunda mitad, versión corta. */
export function shortScope(
  promotion: PromotionScope,
  ctx: ScopeContext
): string {
  const summary = scopeSummary(promotion, ctx)
  if (promotion.tipo === "cantidad" && summary.endsWith(" tiendas")) {
    return "todas las tiendas"
  }
  if (summary === "Todos") return "todos los clientes"
  if (summary === "E-commerce") return "e-commerce"
  if (summary === "Tiendas físicas") return "tiendas físicas"
  return summary.toLowerCase()
}
