import type { Category } from "./queries"

/**
 * Módulo puro (sin `createClient`) a propósito: `catalog-filters-bar.tsx`
 * es un Client Component y necesita esta función en tiempo de ejecución —
 * importarla desde `queries.ts` arrastraría `lib/supabase/server.ts` al
 * bundle de cliente y Next lo rechaza en build.
 */
export type CategoryWithChildren = Category & { children: Category[] }

/** Agrupa subcategorías bajo su raíz — para listas de filtro con indentación. */
export function groupByRoot(categories: Category[]): CategoryWithChildren[] {
  return categories
    .filter((c) => !c.parent_id)
    .map((root) => ({
      ...root,
      children: categories.filter((c) => c.parent_id === root.id),
    }))
}

const PATH_COLORS = [
  "bg-data-indigo",
  "bg-data-coral",
  "bg-data-teal",
  "bg-data-amber",
  "bg-data-navy",
]

function hashString(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * Color estable por categoría RAÍZ (Analgésicos, Vitaminas…), no por
 * posición de la ruta — así todas las subcategorías de "Analgésicos" se ven
 * con el mismo color en la tabla (03.1) y en el detalle (03.3), y filas de
 * categorías distintas se distinguen entre sí de un vistazo.
 */
export function colorByRootCategory(rootName: string): string {
  return PATH_COLORS[hashString(rootName) % PATH_COLORS.length]
}
