import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

import { promotionStatus } from "./status"

export type PromotionRow = Database["public"]["Tables"]["promociones"]["Row"]

export type Condition =
  | { campo: "categoria"; valor: string[] }
  | { campo: "tienda"; valor: string }
  | { campo: "segmento"; valor: string }
  | { campo: "monto_carrito"; valor: number }

export type Promotion = Omit<PromotionRow, "condiciones"> & {
  condiciones: Condition[]
}

function withTypedConditions(row: PromotionRow): Promotion {
  return { ...row, condiciones: (row.condiciones ?? []) as Condition[] }
}

export type PromotionsFilters = {
  search?: string
  publicationStatus?: "borrador" | "activa"
  channel?: string
  page?: number
}

export const PROMOTIONS_PAGE_SIZE = 6

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export async function listPromotions(
  filters: PromotionsFilters = {}
): Promise<{ promotions: Promotion[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const from = (page - 1) * PROMOTIONS_PAGE_SIZE
  const to = from + PROMOTIONS_PAGE_SIZE - 1

  let query = supabase
    .from("promociones")
    .select("*", { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%`)
  }
  if (filters.publicationStatus) {
    query = query.eq("estado_publicacion", filters.publicationStatus)
  }
  if (filters.channel) {
    query = query.eq("canal_aplicacion", filters.channel)
  }

  const { data, error, count } = await query
  if (error) throw error
  return {
    promotions: (data ?? []).map(withTypedConditions),
    total: count ?? 0,
  }
}

export async function getPromotionById(id: string): Promise<Promotion | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data ? withTypedConditions(data) : null
}

/** Excluye `excludeId` (la promoción que se está editando) al calcular colisiones. */
export async function listActivePromotions(
  excludeId?: string
): Promise<Promotion[]> {
  const supabase = await createClient()
  let query = supabase
    .from("promociones")
    .select("*")
    .eq("estado_publicacion", "activa")
  if (excludeId) query = query.neq("id", excludeId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(withTypedConditions)
}

export type PromotionsSummary = {
  total: number
  active: number
  scheduled: number
  assignedBudget: number
}

/** Subtítulo de 06.1: "3 activas · 2 programadas · presupuesto asignado $ 12.400.000". */
export async function getPromotionsSummary(): Promise<PromotionsSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select(
      "estado_publicacion, vigente_desde, vigente_hasta, presupuesto_asignado"
    )
  if (error) throw error

  const rows = data ?? []
  let active = 0
  let scheduled = 0
  for (const row of rows) {
    const status = promotionStatus(row)
    if (status === "activa") active += 1
    else if (status === "programada") scheduled += 1
  }

  return {
    total: rows.length,
    active,
    scheduled,
    assignedBudget: rows.reduce(
      (acc, r) => acc + (r.presupuesto_asignado ?? 0),
      0
    ),
  }
}

/** Top 3 realmente en curso hoy, por presupuesto consumido (06.1: 3 "Promo card" superiores). */
export async function getFeaturedPromotions(limit = 3): Promise<Promotion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("estado_publicacion", "activa")
    .order("presupuesto_consumido", { ascending: false })
  if (error) throw error
  return (data ?? [])
    .map(withTypedConditions)
    .filter((p) => promotionStatus(p) === "activa")
    .slice(0, limit)
}

export type ConditionCategory = { id: string; name: string }

/** Categorías raíz reales de Catálogo, para el selector de la condición "Categoría del producto". */
export async function listConditionCategories(): Promise<ConditionCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .is("parent_id", null)
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((c) => ({ id: c.id, name: c.nombre }))
}

export type ConditionCity = { city: string; totalStores: number }

/** Ciudades reales de Tiendas con conteo, para el selector de la condición "Tienda" (07.1: "Barranquilla (14)"). */
export async function listConditionCities(): Promise<ConditionCity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tiendas").select("ciudad")
  if (error) throw error

  const count = new Map<string, number>()
  for (const row of data ?? []) {
    count.set(row.ciudad, (count.get(row.ciudad) ?? 0) + 1)
  }
  return [...count.entries()]
    .map(([city, totalStores]) => ({ city, totalStores }))
    .sort((a, b) => a.city.localeCompare(b.city))
}

export async function getTotalStores(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("tiendas")
    .select("id", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}

export type ConditionSegment = {
  id: string
  name: string
  estimatedCount: number | null
}

/** Audiencias reales de 11 · Audiencias (`segments`), para el selector de la condición "Segmento del cliente" — duplicado de `features/audiences` por aislamiento entre features (ver CLAUDE.md §2). */
export async function listConditionSegments(): Promise<ConditionSegment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segments")
    .select("id, nombre, conteo_estimado")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.nombre,
    estimatedCount: s.conteo_estimado,
  }))
}

export async function getCategoryNames(
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .in("id", ids)
  if (error) throw error
  return new Map((data ?? []).map((c) => [c.id, c.nombre]))
}
