/**
 * Sin dependencias server-only a propósito (nada de `lib/supabase/server.ts`
 * ni de `lib/queries.ts`, que sí lo importa) — así `schemas.ts` (lo consume
 * un componente cliente) y `queries.ts`/`page.tsx` pueden compartir esta
 * única tupla sin cruzar la frontera servidor/cliente.
 */
export const AUDIENCES_SORTS = ["nombre", "tamano", "journeys"] as const
export type AudiencesSort = (typeof AUDIENCES_SORTS)[number]
