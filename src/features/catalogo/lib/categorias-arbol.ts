import type { Categoria } from "./queries"

/**
 * Módulo puro (sin `createClient`) a propósito: `catalogo-filtros-bar.tsx`
 * es un Client Component y necesita esta función en tiempo de ejecución —
 * importarla desde `queries.ts` arrastraría `lib/supabase/server.ts` al
 * bundle de cliente y Next lo rechaza en build.
 */
export type CategoriaConHijos = Categoria & { hijos: Categoria[] }

/** Agrupa subcategorías bajo su raíz — para listas de filtro con indentación. */
export function agruparPorRaiz(categorias: Categoria[]): CategoriaConHijos[] {
  return categorias
    .filter((c) => !c.parent_id)
    .map((raiz) => ({
      ...raiz,
      hijos: categorias.filter((c) => c.parent_id === raiz.id),
    }))
}

const COLORES_RUTA = [
  "bg-data-indigo",
  "bg-data-coral",
  "bg-data-teal",
  "bg-data-amber",
  "bg-data-navy",
]

function hashCadena(texto: string): number {
  let hash = 0
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * Color estable por categoría RAÍZ (Analgésicos, Vitaminas…), no por
 * posición de la ruta — así todas las subcategorías de "Analgésicos" se ven
 * con el mismo color en la tabla (03.1) y en el detalle (03.3), y filas de
 * categorías distintas se distinguen entre sí de un vistazo.
 */
export function colorPorCategoriaRaiz(nombreRaiz: string): string {
  return COLORES_RUTA[hashCadena(nombreRaiz) % COLORES_RUTA.length]
}
