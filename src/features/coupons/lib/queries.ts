import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import type {
  CouponBatchStatus,
  CouponOrigin,
  CouponStatus,
} from "@/types/domain"

export type CouponBatch = Database["public"]["Tables"]["coupon_batch"]["Row"]
export type Coupon = Database["public"]["Tables"]["coupon"]["Row"]
export type CouponEvent = Database["public"]["Tables"]["coupon_event"]["Row"]
export type CouponRedemption =
  Database["public"]["Tables"]["coupon_redemption"]["Row"]
export type CouponAssignment =
  Database["public"]["Tables"]["coupon_assignment"]["Row"]
export type CouponSearchRow =
  Database["public"]["Views"]["coupon_search"]["Row"]

export const COUPON_BATCHES_PAGE_SIZE = 10
export const COUPONS_PAGE_SIZE = 25

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. Mismo helper que `features/promotions/lib/queries.ts`. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export type CouponBatchFilters = {
  search?: string
  status?: CouponBatchStatus
  origin?: CouponOrigin
  page?: number
}

export async function listCouponBatches(
  filters: CouponBatchFilters = {}
): Promise<{ batches: CouponBatch[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const from = (page - 1) * COUPON_BATCHES_PAGE_SIZE
  const to = from + COUPON_BATCHES_PAGE_SIZE - 1

  let query = supabase
    .from("coupon_batch")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = query.or(`name.ilike.%${search}%,reference.ilike.%${search}%`)
  }
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.origin) query = query.eq("origin", filters.origin)

  const { data, error, count } = await query
  if (error) throw error
  return { batches: data ?? [], total: count ?? 0 }
}

export type CouponFilters = {
  search?: string
  searchScope?: "all" | "person" | "code" | "batch"
  status?: CouponStatus
  batchId?: string
  page?: number
}

/** Regla 7.8 del doc: la búsqueda corre en servidor sobre el universo completo, vía la vista `coupon_search` (denormaliza persona/emisión para poder hacer un `.or()` sobre una sola relación). */
export async function listCoupons(
  filters: CouponFilters = {}
): Promise<{ coupons: CouponSearchRow[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const from = (page - 1) * COUPONS_PAGE_SIZE
  const to = from + COUPONS_PAGE_SIZE - 1

  let query = supabase
    .from("coupon_search")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    const scope = filters.searchScope ?? "all"
    if (scope === "person") {
      query = query.or(
        `member_nombre.ilike.%${search}%,member_email.ilike.%${search}%`
      )
    } else if (scope === "code") {
      query = query.ilike("code", `%${search}%`)
    } else if (scope === "batch") {
      query = query.or(
        `batch_reference.ilike.%${search}%,batch_name.ilike.%${search}%`
      )
    } else {
      query = query.or(
        `code.ilike.%${search}%,member_nombre.ilike.%${search}%,member_email.ilike.%${search}%,batch_reference.ilike.%${search}%,batch_name.ilike.%${search}%`
      )
    }
  }
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.batchId) query = query.eq("batch_id", filters.batchId)

  const { data, error, count } = await query
  if (error) throw error
  return { coupons: data ?? [], total: count ?? 0 }
}

export async function getCouponBatchById(
  id: string
): Promise<CouponBatch | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_batch")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getCouponById(id: string): Promise<Coupon | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listBatchEvents(batchId: string): Promise<CouponEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_event")
    .select("*")
    .eq("batch_id", batchId)
    .order("occurred_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listCouponEvents(
  couponId: string
): Promise<CouponEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_event")
    .select("*")
    .eq("coupon_id", couponId)
    .order("occurred_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listCouponRedemptions(
  couponId: string
): Promise<CouponRedemption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_redemption")
    .select("*")
    .eq("coupon_id", couponId)
    .order("occurred_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listCouponAssignments(
  couponId: string
): Promise<CouponAssignment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_assignment")
    .select("*")
    .eq("coupon_id", couponId)
    .order("assigned_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export type CouponsSummary = {
  totalBatches: number
  pendingApproval: number
  generating: number
  issuedCoupons: number
}

export async function getCouponsSummary(): Promise<CouponsSummary> {
  const supabase = await createClient()
  const [
    { count: totalBatches },
    { count: pendingApproval },
    { count: generating },
    { count: issuedCoupons },
  ] = await Promise.all([
    supabase.from("coupon_batch").select("*", { count: "exact", head: true }),
    supabase
      .from("coupon_batch")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase
      .from("coupon_batch")
      .select("*", { count: "exact", head: true })
      .eq("status", "generating"),
    supabase
      .from("coupon")
      .select("*", { count: "exact", head: true })
      .in("status", ["issued", "assigned"]),
  ])
  return {
    totalBatches: totalBatches ?? 0,
    pendingApproval: pendingApproval ?? 0,
    generating: generating ?? 0,
    issuedCoupons: issuedCoupons ?? 0,
  }
}

/** Chips de estado con contador (doc §4.1) sobre el universo COMPLETO, no la página cargada. */
export async function getCouponStatusCounts(): Promise<
  Record<CouponStatus | "expired", number>
> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("coupon").select("status")
  if (error) throw error

  const counts: Record<string, number> = {
    draft: 0,
    issued: 0,
    assigned: 0,
    redeemed: 0,
    cancelled: 0,
    expired: 0,
  }
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1
  }
  return counts as Record<CouponStatus | "expired", number>
}

// --- Lookups para el asistente ---

export type AudienceOption = {
  id: string
  name: string
  estimatedCount: number | null
}

export async function listAudienceSegments(): Promise<AudienceOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segments")
    .select("id, nombre, conteo_estimado")
    .eq("estado", "activa")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.nombre,
    estimatedCount: s.conteo_estimado,
  }))
}

/** Cuántos miembros de la muestra de `segment_members` quedan disponibles hoy para un segmento — `segments.conteo_estimado` es el tamaño real de la audiencia, esta es la muestra RESOLUBLE (ver nota en generate_coupon_batch_chunk). */
export async function countResolvableAudienceMembers(
  segmentId: string
): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("segment_members")
    .select("*", { count: "exact", head: true })
    .eq("segment_id", segmentId)
  if (error) throw error
  return count ?? 0
}

export type MemberOption = { id: string; name: string; email: string }

export async function searchMembers(search: string): Promise<MemberOption[]> {
  const supabase = await createClient()
  const clean = sanitizeSearch(search)
  if (!clean) return []
  const { data, error } = await supabase
    .from("members")
    .select("id, nombre, email")
    .or(`nombre.ilike.%${clean}%,email.ilike.%${clean}%`)
    .limit(20)
  if (error) throw error
  return (data ?? []).map((m) => ({ id: m.id, name: m.nombre, email: m.email }))
}

export type CatalogOption = { id: string; name: string }

export async function listRestrictionStores(): Promise<CatalogOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((t) => ({ id: t.id, name: t.nombre }))
}

export async function listRestrictionCategories(): Promise<CatalogOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((c) => ({ id: c.id, name: c.nombre }))
}

export type ProductOption = { id: string; name: string; sku: string }

export async function listFreeProductOptions(
  search?: string
): Promise<ProductOption[]> {
  const supabase = await createClient()
  let query = supabase
    .from("productos")
    .select("id, nombre, sku")
    .eq("estado", "activo")
    .order("nombre")
    .limit(50)
  if (search) {
    const clean = sanitizeSearch(search)
    if (clean) query = query.ilike("nombre", `%${clean}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((p) => ({ id: p.id, name: p.nombre, sku: p.sku }))
}

export async function listLinkablePromotions(): Promise<CatalogOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("id, nombre")
    .eq("estado_publicacion", "activa")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((p) => ({ id: p.id, name: p.nombre }))
}

/** Cuántas personas de la org, aparte de `excludeProfileId`, tienen `cupones:aprobar` — usado por el flujo de aprobación para evitar el interbloqueo del aprobador único. */
export async function countOtherApprovers(
  orgId: string,
  excludeProfileId: string
): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role_id, roles!inner(role_permissions!inner(recurso, accion))")
    .eq("org_id", orgId)
    .eq("estado", "activo")
    .neq("id", excludeProfileId)
    .eq("roles.role_permissions.recurso", "cupones")
    .eq("roles.role_permissions.accion", "aprobar")
  if (error) throw error
  return data?.length ?? 0
}
