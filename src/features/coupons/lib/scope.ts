type RestrictionScope = {
  store_ids: string[]
  category_ids: string[]
}

type ScopeContext = {
  totalStores: number
  storeNameById: Map<string, string>
  categoryNameById: Map<string, string>
}

/**
 * Resumen de restricciones de una emisión ("todas las tiendas", "14 tiendas
 * · 3 categorías") — se computa desde `store_ids`/`category_ids` en vez de
 * guardarse aparte, mismo criterio que `features/promotions/lib/scope.ts`.
 */
export function restrictionSummary(
  batch: RestrictionScope,
  ctx: ScopeContext
): string {
  const parts: string[] = []

  if (batch.store_ids.length > 0) {
    parts.push(
      batch.store_ids.length === 1
        ? (ctx.storeNameById.get(batch.store_ids[0]) ?? "1 tienda")
        : `${batch.store_ids.length} tiendas`
    )
  } else {
    parts.push(`todas las tiendas (${ctx.totalStores})`)
  }

  if (batch.category_ids.length > 0) {
    parts.push(
      batch.category_ids.length === 1
        ? (ctx.categoryNameById.get(batch.category_ids[0]) ?? "1 categoría")
        : `${batch.category_ids.length} categorías`
    )
  }

  return parts.join(" · ")
}
