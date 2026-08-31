import type { PostgrestError } from "@supabase/supabase-js"

import { EXPORT_ROW_CAP } from "@/lib/csv"

/** PostgREST recorta cualquier `.select()` a `max_rows` (1000,
 *  `supabase/config.toml`) incluso pidiendo un Range mayor — el tamaño de
 *  página ES 1000 y no se sube sin tocar la config del servidor. */
const PAGE_SIZE = 1000

type RangedResponse<T> = {
  data: T[] | null
  error: PostgrestError | null
  count: number | null
}

export type PagedAll<T> = { rows: T[]; total: number; truncated: boolean }

/**
 * Trae el universo completo de una consulta paginando en bucle de a 1000
 * filas (el tope real de PostgREST), hasta `cap` filas (`EXPORT_ROW_CAP` por
 * defecto). `buildQuery` debe construir una consulta NUEVA en cada llamada
 * — un `PostgrestFilterBuilder` es re-esperable, pero reusarlo depende de
 * mutación no documentada; un closure que reconstruye la cascada de filtros
 * es explícito y además obligatorio cuando la cascada necesita un `await`
 * previo (p. ej. una pre-consulta de categorías en catálogo).
 *
 * `truncated` se deriva del `count` exacto de la primera página, no de "se
 * llegó al tope" — así el mensaje al usuario puede decir "…de 24.531" en vez
 * de "…puede haber más".
 */
export async function fetchAllPaged<T>(
  buildQuery: (from: number, to: number) => PromiseLike<RangedResponse<T>>,
  cap: number = EXPORT_ROW_CAP
): Promise<PagedAll<T>> {
  const rows: T[] = []
  let total = 0

  for (let from = 0; from < cap; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, cap) - 1
    const { data, error, count } = await buildQuery(from, to)
    if (error) throw error

    const page = data ?? []
    if (from === 0) total = count ?? page.length
    rows.push(...page)

    const pageLength = to - from + 1
    if (page.length < pageLength) break
    if (total && rows.length >= total) break
  }

  const truncated = total > cap
  return { rows: rows.slice(0, cap), total: total || rows.length, truncated }
}
