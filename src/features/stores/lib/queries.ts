import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

export type Store = Database["public"]["Tables"]["tiendas"]["Row"]

export type StoresFilters = {
  search?: string
  city?: string
  format?: string
  page?: number
  pageSize?: number
}

export const STORES_PAGE_SIZE = 8

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export async function listStores(
  filters: StoresFilters = {}
): Promise<{ stores: Store[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? STORES_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("tiendas")
    .select("*", { count: "exact" })
    .order("nombre")
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = query.or(`nombre.ilike.%${search}%,codigo_tienda.ilike.%${search}%`)
  }
  if (filters.city) {
    query = query.eq("ciudad", filters.city)
  }
  if (filters.format) {
    query = query.eq("formato", filters.format)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { stores: data ?? [], total: count ?? 0 }
}

export async function getStoreById(id: string): Promise<Store | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listCities(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("ciudad")
    .order("ciudad")
  if (error) throw error
  return [...new Set((data ?? []).map((t) => t.ciudad))]
}

export type StoreGroupOption = {
  id: string
  name: string
  description: string | null
  storeCount: number
}

/** Grupos de tienda de la org, con conteo de tiendas asignadas — alimenta el Select del formulario y `StoreGroupsDialog`. */
export async function listStoreGroups(): Promise<StoreGroupOption[]> {
  const supabase = await createClient()
  const [{ data: groups, error }, { data: stores, error: storesError }] =
    await Promise.all([
      supabase
        .from("tienda_grupos")
        .select("id, nombre, descripcion")
        .order("nombre"),
      supabase.from("tiendas").select("grupo_id"),
    ])
  if (error) throw error
  if (storesError) throw storesError

  const countByGroupId = new Map<string, number>()
  for (const row of stores ?? []) {
    countByGroupId.set(
      row.grupo_id,
      (countByGroupId.get(row.grupo_id) ?? 0) + 1
    )
  }

  return (groups ?? []).map((g) => ({
    id: g.id,
    name: g.nombre,
    description: g.descripcion,
    storeCount: countByGroupId.get(g.id) ?? 0,
  }))
}

export type StoresSummary = {
  total: number
  operating: number
  opening: number
  withIssues: number
}

/** Cuenta por estado para el subtítulo del listado (04.1: "42 tiendas · 38 operando · …"). */
export async function getStoresSummary(): Promise<StoresSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tiendas").select("estado")
  if (error) throw error

  const rows = data ?? []
  const count = (status: string) =>
    rows.filter((t) => t.estado === status).length

  return {
    total: rows.length,
    operating: count("operando"),
    opening: count("en_apertura"),
    withIssues: count("bajo_meta") + count("cerrada_temporal"),
  }
}
