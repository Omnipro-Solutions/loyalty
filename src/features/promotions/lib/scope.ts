import { formatUSD } from "@/lib/format"

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
