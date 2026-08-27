import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import {
  COUPON_BATCH_STATUSES,
  COUPON_DISPLAY_STATUSES,
  type CouponBatchStatus,
  type CouponDisplayStatus,
  type CouponOrigin,
  type CouponSearchScope,
  type CouponStatus,
} from "@/types/domain"

import { couponStatus } from "./status"

export type CouponBatch = Database["public"]["Tables"]["coupon_batch"]["Row"]
export type Coupon = Database["public"]["Tables"]["coupon"]["Row"]
export type CouponEvent = Database["public"]["Tables"]["coupon_event"]["Row"]
export type CouponRedemption =
  Database["public"]["Tables"]["coupon_redemption"]["Row"]
export type CouponAssignment =
  Database["public"]["Tables"]["coupon_assignment"]["Row"]
export type CouponApproval =
  Database["public"]["Tables"]["coupon_approval"]["Row"]

type CouponSearchViewRow = Database["public"]["Views"]["coupon_search"]["Row"]

/**
 * Postgres no propaga `not null` a través de una vista — el generador real
 * de tipos (`supabase gen types`) marca TODAS las columnas de
 * `coupon_search` como nulables, aunque `coupon.id/org_id/code/status/
 * batch_id/created_at` sean `not null` en la tabla origen. Este tipo
 * restaura esa garantía real (la vista es un `select` directo, sin joins
 * que puedan volver nula esa parte) para no propagar `| null` por toda la
 * UI en campos que estructuralmente nunca lo son.
 */
export type CouponSearchRow = {
  id: string
  org_id: string
  code: string
  status: string
  valid_to: string | null
  batch_id: string
  member_id: string | null
  created_at: string
  member_nombre: string | null
  member_email: string | null
  batch_reference: string | null
  batch_name: string | null
  discount_type: string
  discount_value: number
  discount_cap: number | null
  points_cost: number | null
}

function toCouponSearchRow(row: CouponSearchViewRow): CouponSearchRow {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    code: row.code as string,
    status: row.status as string,
    valid_to: row.valid_to,
    batch_id: row.batch_id as string,
    member_id: row.member_id,
    created_at: row.created_at as string,
    member_nombre: row.member_nombre,
    member_email: row.member_email,
    batch_reference: row.batch_reference,
    batch_name: row.batch_name,
    discount_type: row.discount_type as string,
    discount_value: row.discount_value as number,
    discount_cap: row.discount_cap,
    points_cost: row.points_cost,
  }
}

export const COUPON_BATCHES_PAGE_SIZE = 10
export const COUPONS_PAGE_SIZE = 25

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. Mismo helper que `features/promotions/lib/queries.ts`. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export type CouponBatchFilters = {
  search?: string
  searchScope?: CouponSearchScope
  status?: CouponBatchStatus
  origin?: CouponOrigin
  validFrom?: string
  validTo?: string
  page?: number
  pageSize?: number
}

/** Emisiones cuyos CUPONES (no la emisión en sí) coinciden con la búsqueda — así "Todo"/"ID cupón"/"Persona" en 13.1 encuentran la emisión dueña de un código o de un titular, no solo por nombre/referencia. */
async function batchIdsMatchingCouponSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  search: string,
  scope: CouponSearchScope
): Promise<string[]> {
  let query = supabase.from("coupon_search").select("batch_id")
  if (scope === "person") {
    query = query.or(
      `member_nombre.ilike.%${search}%,member_email.ilike.%${search}%`
    )
  } else if (scope === "code") {
    query = query.ilike("code", `%${search}%`)
  } else {
    query = query.or(
      `code.ilike.%${search}%,member_nombre.ilike.%${search}%,member_email.ilike.%${search}%`
    )
  }
  const { data, error } = await query
  if (error) throw error
  return [
    ...new Set((data ?? []).map((r) => r.batch_id).filter(Boolean)),
  ] as string[]
}

/**
 * Fila de emisión enriquecida con lo que la tabla necesita mostrar sin un
 * join aparte por fila: SKU del producto gratis (columna "VALOR DEL
 * CUPÓN") y nombre de quien autorizó (panel expandido "Datos de la
 * emisión"). Ambos son embebidos de Supabase (FK ya declaradas en el
 * esquema), no consultas nuevas.
 */
export type CouponBatchListItem = CouponBatch & {
  free_product: { sku: string } | null
  authorized_by_profile: { nombre: string } | null
  approved_by_profile: { nombre: string } | null
}

export async function listCouponBatches(
  filters: CouponBatchFilters = {}
): Promise<{ batches: CouponBatchListItem[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? COUPON_BATCHES_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("coupon_batch")
    .select(
      "*, free_product:productos!coupon_batch_free_product_id_fkey(sku), authorized_by_profile:profiles!coupon_batch_authorized_by_fkey(nombre), approved_by_profile:profiles!coupon_batch_approved_by_fkey(nombre)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    const scope = filters.searchScope ?? "all"
    if (scope === "batch") {
      query = query.or(`name.ilike.%${search}%,reference.ilike.%${search}%`)
    } else {
      const matchedIds = await batchIdsMatchingCouponSearch(
        supabase,
        search,
        scope
      )
      const idFilter =
        matchedIds.length > 0
          ? `id.in.(${matchedIds.join(",")})`
          : "id.eq.00000000-0000-0000-0000-000000000000"
      query =
        scope === "all"
          ? query.or(
              `name.ilike.%${search}%,reference.ilike.%${search}%,${idFilter}`
            )
          : query.or(idFilter)
    }
  }
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.origin) query = query.eq("origin", filters.origin)
  // "Vigente en el rango": la emisión sigue vigente en la fecha de inicio
  // del rango (o no tiene fin) y ya arrancó antes del fin del rango.
  if (filters.validFrom) {
    query = query.or(`valid_to.is.null,valid_to.gte.${filters.validFrom}`)
  }
  if (filters.validTo) query = query.lte("valid_from", filters.validTo)

  const { data, error, count } = await query
  if (error) throw error
  return { batches: (data ?? []) as CouponBatchListItem[], total: count ?? 0 }
}

/** Conteo por estado (chips de 13.1, "Todas/Borrador/Generando/Emitidas/Cerradas/Anuladas") sobre el universo completo, no la página cargada. */
export async function getCouponBatchStatusCounts(): Promise<
  Record<CouponBatchStatus, number>
> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("coupon_batch").select("status")
  if (error) throw error

  const counts = Object.fromEntries(
    COUPON_BATCH_STATUSES.map((s) => [s, 0])
  ) as Record<CouponBatchStatus, number>
  for (const row of data ?? []) {
    const status = row.status as CouponBatchStatus
    counts[status] = (counts[status] ?? 0) + 1
  }
  return counts
}

/** Muestra de códigos por emisión para el panel expandido (Figma 13.1 "Muestra de códigos generados") — reusa `coupon_search` (ya denormaliza el titular) en vez de un join propio. */
export async function listSampleCoupons(
  batchIds: string[],
  limitPerBatch = 6
): Promise<Record<string, { code: string; memberNombre: string | null }[]>> {
  if (batchIds.length === 0) return {}
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_search")
    .select("batch_id, code, member_nombre, created_at")
    .in("batch_id", batchIds)
    .order("created_at", { ascending: true })
    .limit(batchIds.length * limitPerBatch * 4)
  if (error) throw error

  const byBatch: Record<
    string,
    { code: string; memberNombre: string | null }[]
  > = {}
  for (const row of data ?? []) {
    const batchId = row.batch_id as string | null
    if (!batchId) continue
    const list = (byBatch[batchId] ??= [])
    if (list.length >= limitPerBatch) continue
    list.push({ code: row.code as string, memberNombre: row.member_nombre })
  }
  return byBatch
}

export type CouponFilters = {
  search?: string
  searchScope?: CouponSearchScope
  status?: CouponStatus
  batchId?: string
  validFrom?: string
  validTo?: string
  page?: number
  pageSize?: number
}

/** Regla 7.8 del doc: la búsqueda corre en servidor sobre el universo completo, vía la vista `coupon_search` (denormaliza persona/emisión para poder hacer un `.or()` sobre una sola relación). */
export async function listCoupons(
  filters: CouponFilters = {}
): Promise<{ coupons: CouponSearchRow[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? COUPONS_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("coupon_search")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = applyCouponSearchFilter(query, search, filters.searchScope ?? "all")
  }
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.batchId) query = query.eq("batch_id", filters.batchId)
  if (filters.validFrom) {
    query = query.or(`valid_to.is.null,valid_to.gte.${filters.validFrom}`)
  }
  if (filters.validTo) query = query.lte("valid_from", filters.validTo)

  const { data, error, count } = await query
  if (error) throw error
  return { coupons: (data ?? []).map(toCouponSearchRow), total: count ?? 0 }
}

/** Mismos embebidos que `listCouponBatches` (SKU del regalo, quien autorizó) — "Emisión de origen" de 13.4 los necesita igual que la fila expandida de 13.1. */
export async function getCouponBatchById(
  id: string
): Promise<CouponBatchListItem | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_batch")
    .select(
      "*, free_product:productos!coupon_batch_free_product_id_fkey(sku), authorized_by_profile:profiles!coupon_batch_authorized_by_fkey(nombre), approved_by_profile:profiles!coupon_batch_approved_by_fkey(nombre)"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as CouponBatchListItem | null
}

export type CouponWithHolder = Coupon & {
  member: { nombre: string; email: string } | null
}

export async function getCouponById(
  id: string
): Promise<CouponWithHolder | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon")
    .select("*, member:members!coupon_member_id_fkey(nombre, email)")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as CouponWithHolder | null
}

// Tope defensivo para las 5 listas de historial de abajo (eventos,
// redenciones, asignaciones, trabajos de impresión) — hoy acotadas en la
// práctica por su cupón/emisión dueño, pero sin límite explícito una
// emisión o cupón con actividad anómala haría crecer la respuesta sin
// techo. Mismo valor que `getProductHistory` (catalog/lib/queries.ts).
const COUPON_HISTORY_LIMIT = 200

export async function listBatchEvents(batchId: string): Promise<CouponEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_event")
    .select("*")
    .eq("batch_id", batchId)
    .order("occurred_at", { ascending: false })
    .limit(COUPON_HISTORY_LIMIT)
  if (error) throw error
  return data ?? []
}

/** Orden cronológico ascendente (Figma 13.4 "Log de eventos" se lee de arriba hacia abajo como una historia, no como un feed de "lo más reciente primero"). */
export async function listCouponEvents(
  couponId: string
): Promise<CouponEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_event")
    .select("*")
    .eq("coupon_id", couponId)
    .order("occurred_at", { ascending: true })
    .limit(COUPON_HISTORY_LIMIT)
  if (error) throw error
  return data ?? []
}

export type CouponRedemptionWithStore = CouponRedemption & {
  tienda: { nombre: string } | null
}

export async function listCouponRedemptions(
  couponId: string
): Promise<CouponRedemptionWithStore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_redemption")
    .select("*, tienda:tiendas(nombre)")
    .eq("coupon_id", couponId)
    .order("occurred_at", { ascending: false })
    .limit(COUPON_HISTORY_LIMIT)
  if (error) throw error
  return (data ?? []) as CouponRedemptionWithStore[]
}

export type CouponAssignmentWithMember = CouponAssignment & {
  member: { nombre: string; email: string } | null
}

export async function listCouponAssignments(
  couponId: string
): Promise<CouponAssignmentWithMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_assignment")
    .select("*, member:members!coupon_assignment_member_id_fkey(nombre, email)")
    .eq("coupon_id", couponId)
    .order("assigned_at", { ascending: false })
    .limit(COUPON_HISTORY_LIMIT)
  if (error) throw error
  return (data ?? []) as CouponAssignmentWithMember[]
}

export type CouponPrintJob =
  Database["public"]["Tables"]["coupon_print_job"]["Row"]

/** Trabajos de impresión que incluyeron este cupón (`coupon_ids` es un array por lote, no una FK 1:1). */
export async function listCouponPrintJobs(
  couponId: string
): Promise<CouponPrintJob[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_print_job")
    .select("*")
    .contains("coupon_ids", [couponId])
    .order("created_at", { ascending: false })
    .limit(COUPON_HISTORY_LIMIT)
  if (error) throw error
  return data ?? []
}

function applyCouponSearchFilter<
  T extends { or: (f: string) => T; ilike: (c: string, v: string) => T },
>(query: T, search: string, scope: CouponSearchScope): T {
  if (scope === "person") {
    return query.or(
      `member_nombre.ilike.%${search}%,member_email.ilike.%${search}%`
    )
  }
  if (scope === "code") return query.ilike("code", `%${search}%`)
  if (scope === "batch") {
    return query.or(
      `batch_reference.ilike.%${search}%,batch_name.ilike.%${search}%`
    )
  }
  return query.or(
    `code.ilike.%${search}%,member_nombre.ilike.%${search}%,member_email.ilike.%${search}%,batch_reference.ilike.%${search}%,batch_name.ilike.%${search}%`
  )
}

export type CouponOriginSlice = {
  origin: CouponOrigin
  count: number
  share: number
}

export type CouponAttentionItem = {
  id:
    | "por_vencer"
    | "pendientes_aprobacion"
    | "emisiones_borrador"
    | "emisiones_generando"
    | "vencidos_sin_cerrar"
    | "activos_sin_canjear"
    | "sin_titular"
    | "puntos_sin_devolver"
  count: number
  detail?: string
  href?: string
  tone: "warning" | "destructive" | "neutral"
}

export type CouponCommercialKpis = {
  /** Cómo se reparten los cupones por origen — de dónde salen y cuál manda. */
  mix: {
    total: number
    slices: CouponOriginSlice[]
    dominant: CouponOriginSlice | null
  }
  /** Estado de la cartera entregada (sin borradores ni anulados). */
  portfolio: {
    /** Cupones que llegaron a un cliente: emitidos, asignados, canjeados y vencidos. */
    delivered: number
    issued: number
    assigned: number
    redeemed: number
    expired: number
    cancelled: number
    /** `redeemed / delivered` — 0 si todavía no se entregó ninguno. */
    redemptionRate: number
    /** Puntos que los clientes ya gastaron en cupones canjeados. */
    pointsRedeemed: number
    /** Puntos comprometidos en cupones vivos: lo serán si se canjean. */
    pointsCommitted: number
  }
  attention: CouponAttentionItem[]
}

/** Ventana de "por vencer" — un mes es el horizonte en el que todavía da tiempo a reenviar o extender la vigencia. */
const EXPIRING_SOON_DAYS = 30

/**
 * KPIs del listado de cupones (13.2), con el mismo enfoque que los de
 * Promociones: MEZCLA → CARTERA → PENDIENTES. Todo sale de columnas reales
 * de `coupon` sobre el universo completo.
 *
 * Deliberadamente NO hay un "monto entregado en descuentos": el valor real
 * de un cupón porcentual depende del ticket contra el que se canjeó, y en
 * este proyecto no existe la tabla de transacciones (mismo hueco que
 * documenta `20260823120000_promociones.sql`). Sumar solo los de monto fijo
 * daría una cifra que parece el total y no lo es, así que el impacto
 * económico se expresa en puntos, que sí son un dato completo.
 */
export async function getCouponCommercialKpis(): Promise<CouponCommercialKpis> {
  const supabase = await createClient()
  // `origin` vive en la EMISIÓN, no en el cupón: se resuelve por
  // `batch_id` en vez de asumir una columna que `coupon` no tiene.
  const [
    { data, error },
    { data: batches, error: batchesError },
    pendingApprovals,
    batchCounts,
  ] = await Promise.all([
    supabase
      .from("coupon")
      .select(
        "status, valid_to, points_cost, batch_id, member_id, bearer, points_charged_at, points_refunded"
      ),
    supabase.from("coupon_batch").select("id, origin"),
    getPendingApprovalsCount(),
    countBatchesByStatus(),
  ])
  if (error) throw error
  if (batchesError) throw batchesError

  const originByBatch = new Map(
    (batches ?? []).map((batch) => [batch.id, batch.origin as CouponOrigin])
  )

  const rows = data ?? []
  const now = new Date()
  const soonLimit = new Date(now)
  soonLimit.setDate(soonLimit.getDate() + EXPIRING_SOON_DAYS)

  const originCounts = new Map<CouponOrigin, number>()
  let delivered = 0
  let issued = 0
  let assigned = 0
  let redeemed = 0
  let expired = 0
  let cancelled = 0
  let pointsRedeemed = 0
  let pointsCommitted = 0
  let expiringSoon = 0
  let withoutHolder = 0
  let pointsNotRefunded = 0

  for (const row of rows) {
    const origin = originByBatch.get(row.batch_id)
    if (origin) originCounts.set(origin, (originCounts.get(origin) ?? 0) + 1)

    const display = couponStatus({
      status: row.status as CouponStatus,
      valid_to: row.valid_to,
    })
    if (display === "cancelled") {
      cancelled += 1
      // El cliente pagó puntos por un cupón que se anuló y no se le
      // devolvieron: es deuda con el socio, no un detalle de estado.
      if (
        row.points_charged_at != null &&
        !row.points_refunded &&
        (row.points_cost ?? 0) > 0
      ) {
        pointsNotRefunded += 1
      }
      continue
    }
    // `draft` todavía no llegó a nadie: no dice nada de la cartera.
    if (display === "draft") continue

    delivered += 1
    const points = row.points_cost ?? 0

    if (display === "redeemed") {
      redeemed += 1
      pointsRedeemed += points
      continue
    }
    if (display === "expired") {
      expired += 1
      continue
    }
    if (display === "issued") issued += 1
    else if (display === "assigned") assigned += 1

    // Cupón vivo que no tiene a quién cobrarle ni a quién avisar. Los "al
    // portador" no cuentan: ahí la ausencia de titular es intencional, se
    // asocian a quien los canjee.
    if (row.member_id == null && !row.bearer) withoutHolder += 1

    pointsCommitted += points
    if (row.valid_to) {
      const validTo = new Date(row.valid_to)
      if (validTo >= now && validTo <= soonLimit) expiringSoon += 1
    }
  }

  const total = rows.length
  const slices = [...originCounts.entries()]
    .map(([origin, count]) => ({
      origin,
      count,
      share: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const attention: CouponAttentionItem[] = [
    {
      id: "por_vencer" as const,
      count: expiringSoon,
      detail: `próximos ${EXPIRING_SOON_DAYS} días`,
      href: "/cupones?vista=coupons&estado=issued",
      tone: "warning" as const,
    },
    {
      id: "pendientes_aprobacion" as const,
      count: pendingApprovals,
      detail: "esperan decisión",
      href: "/cupones/aprobaciones",
      tone: "destructive" as const,
    },
    {
      id: "emisiones_borrador" as const,
      count: batchCounts.draft,
      detail: "sin emitir",
      href: "/cupones?estado=draft",
      tone: "neutral" as const,
    },
    {
      id: "emisiones_generando" as const,
      count: batchCounts.generating,
      detail: "atascadas generando",
      href: "/cupones?estado=generating",
      tone: "destructive" as const,
    },
    {
      id: "sin_titular" as const,
      count: withoutHolder,
      detail: "vigentes, sin dueño conocido",
      tone: "warning" as const,
    },
    {
      // Cartera viva: entregados, en vigencia y todavía sin usar. No es un
      // error — es el saldo que sigue abierto y puede vencerse solo.
      id: "activos_sin_canjear" as const,
      count: issued + assigned,
      detail: "vigentes, todavía sin usar",
      tone: "neutral" as const,
    },
    {
      id: "puntos_sin_devolver" as const,
      count: pointsNotRefunded,
      detail: "anulados con puntos cobrados",
      tone: "destructive" as const,
    },
    {
      id: "vencidos_sin_cerrar" as const,
      count: expired,
      detail: "sin canjearse",
      tone: "neutral" as const,
    },
  ]
    .filter((item) => item.count > 0)
    // Lo urgente primero: dentro de cada tono, lo más numeroso arriba.
    .sort(
      (a, b) =>
        ATTENTION_TONE_ORDER[a.tone] - ATTENTION_TONE_ORDER[b.tone] ||
        b.count - a.count
    )

  return {
    mix: { total, slices, dominant: slices[0] ?? null },
    portfolio: {
      delivered,
      issued,
      assigned,
      redeemed,
      expired,
      cancelled,
      redemptionRate: delivered > 0 ? redeemed / delivered : 0,
      pointsRedeemed,
      pointsCommitted,
    },
    attention,
  }
}

/** Orden de urgencia de los pendientes — el mismo criterio en Promociones y Cupones. */
const ATTENTION_TONE_ORDER = { destructive: 0, warning: 1, neutral: 2 }

/** Emisiones a medias: creadas sin emitir, o atascadas generando. */
async function countBatchesByStatus(): Promise<{
  draft: number
  generating: number
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_batch")
    .select("status")
    .in("status", ["draft", "generating"])
  if (error) throw error
  const rows = data ?? []
  return {
    draft: rows.filter((row) => row.status === "draft").length,
    generating: rows.filter((row) => row.status === "generating").length,
  }
}

export type CouponStatusCount = { total: number; matched: number | null }

/**
 * Conteo por estado visible (chips de 13.2) sobre el universo COMPLETO, no
 * la página cargada. Con búsqueda activa, además calcula `matched` — las
 * coincidencias de esa búsqueda dentro de cada estado ("21 de 842") — sobre
 * el mismo criterio que `listCoupons`. `expired` se deriva cruzando
 * `status`×`valid_to` (no es un valor almacenado, ver `couponStatus`).
 */
export async function getCouponStatusCounts(
  search?: string,
  searchScope?: CouponSearchScope
): Promise<Record<CouponDisplayStatus, CouponStatusCount>> {
  const supabase = await createClient()

  function tally(rows: { status: string; valid_to: string | null }[]) {
    const counts = Object.fromEntries(
      COUPON_DISPLAY_STATUSES.map((s) => [s, 0])
    ) as Record<CouponDisplayStatus, number>
    for (const row of rows) {
      const display = couponStatus({
        status: row.status as CouponStatus,
        valid_to: row.valid_to,
      })
      counts[display] += 1
    }
    return counts
  }

  const { data: allRows, error } = await supabase
    .from("coupon")
    .select("status, valid_to")
  if (error) throw error
  const totals = tally(allRows ?? [])

  let matched: Record<CouponDisplayStatus, number> | null = null
  const clean = search ? sanitizeSearch(search) : ""
  if (clean) {
    const query = applyCouponSearchFilter(
      supabase.from("coupon_search").select("status, valid_to"),
      clean,
      searchScope ?? "all"
    )
    const { data: matchedRows, error: matchedError } = await query
    if (matchedError) throw matchedError
    matched = tally(
      (matchedRows ?? []) as { status: string; valid_to: string | null }[]
    )
  }

  const result = {} as Record<CouponDisplayStatus, CouponStatusCount>
  for (const status of COUPON_DISPLAY_STATUSES) {
    result[status] = {
      total: totals[status],
      matched: matched ? matched[status] : null,
    }
  }
  return result
}

/** Emisiones distintas entre los cupones que coinciden con la búsqueda (línea de contexto de 13.2: "48 cupones de 4 emisiones distintas"). */
export async function countDistinctBatchesForCoupons(
  search: string,
  searchScope?: CouponSearchScope
): Promise<number> {
  const supabase = await createClient()
  const clean = sanitizeSearch(search)
  if (!clean) return 0
  const query = applyCouponSearchFilter(
    supabase.from("coupon_search").select("batch_id"),
    clean,
    searchScope ?? "all"
  )
  const { data, error } = await query
  if (error) throw error
  return new Set((data ?? []).map((r) => r.batch_id).filter(Boolean)).size
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

/**
 * Clientes elegibles como titular de un cupón, para el paso "Destinatario"
 * del asistente (13.2). Devuelve la lista COMPLETA a propósito: el
 * selector filtra en cliente, así que un tope aquí haría que buscar a
 * alguien que existe no lo encontrara — y en un campo obligatorio eso se
 * lee como "ese cliente no está dado de alta", que es mentira. Con el
 * tamaño de un tenant de demo (cientos de socios) el coste es despreciable;
 * si un día son decenas de miles, lo que toca es un picker con búsqueda
 * contra el servidor, no truncar la lista en silencio.
 */
export async function listMemberOptions(): Promise<MemberOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("members")
    .select("id, nombre, email")
    .order("nombre")
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

/** `brand`/`price` (`marca`, `precio`) alimentan las columnas del picker de productos (`ProductPickerRow`) — no requieren un join, ya son columnas de `productos`. */
export type ProductOption = {
  id: string
  name: string
  sku: string
  brand: string | null
  price: number
}

export async function listFreeProductOptions(
  search?: string
): Promise<ProductOption[]> {
  const supabase = await createClient()
  let query = supabase
    .from("productos")
    .select("id, nombre, sku, marca, precio")
    .eq("estado", "activo")
    .order("nombre")
    .limit(50)
  if (search) {
    const clean = sanitizeSearch(search)
    if (clean) query = query.ilike("nombre", `%${clean}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.nombre,
    sku: p.sku,
    brand: p.marca,
    price: p.precio,
  }))
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

export type ProfileWithPermissions = {
  profileId: string
  orgId: string
  roleId: string
  permissions: Set<string>
}

/** Calco de `features/team/lib/queries.ts` `getProfileWithPermissions` — duplicado a propósito, las features no se importan entre sí (ver CLAUDE.md §2). Decide qué botones de acción mostrar en `/cupones/[id]`. */
export async function getProfileWithPermissions(): Promise<ProfileWithPermissions | null> {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("org_id, role_id")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw error
  if (!profile) return null

  const { data: permissions, error: permissionsError } = await supabase
    .from("role_permissions")
    .select("recurso, accion")
    .eq("role_id", profile.role_id)
  if (permissionsError) throw permissionsError

  return {
    profileId: user.id,
    orgId: profile.org_id,
    roleId: profile.role_id,
    permissions: new Set(
      (permissions ?? []).map((p) => `${p.recurso}:${p.accion}`)
    ),
  }
}

export type CouponApprovalWithBatch = CouponApproval & {
  requested_by_profile: { nombre: string } | null
  approver_profile: { nombre: string } | null
  batch: {
    reference: string
    name: string
    origin: string
    requested_quantity: number
    discount_type: string
    discount_value: number
    discount_cap: number | null
    min_purchase_amount: number | null
    points_cost: number | null
    points_rate: number | null
    free_product_id: string | null
  } | null
}

const APPROVAL_EMBED =
  "*, requested_by_profile:profiles!coupon_approval_requested_by_fkey(nombre), approver_profile:profiles!coupon_approval_approver_id_fkey(nombre), batch:coupon_batch!coupon_approval_batch_id_fkey(reference, name, origin, requested_quantity, discount_type, discount_value, discount_cap, min_purchase_amount, points_cost, points_rate, free_product_id)"

/** Cola de `/cupones/aprobaciones` — las más antiguas primero (quien lleva más tiempo esperando, primero). */
export async function listPendingApprovals(): Promise<
  CouponApprovalWithBatch[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_approval")
    .select(APPROVAL_EMBED)
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as CouponApprovalWithBatch[]
}

/** Historial (decididas o retiradas) — mismo embed, más recientes primero. */
export async function listDecidedApprovals(
  limit = 20
): Promise<CouponApprovalWithBatch[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_approval")
    .select(APPROVAL_EMBED)
    .neq("status", "pending")
    .order("decided_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as CouponApprovalWithBatch[]
}

/** Sin el límite de 25 de `listCoupons` — "Exportar CSV" de una emisión necesita el universo de esa emisión, no una página. */
export async function listAllCouponsForBatch(
  batchId: string
): Promise<CouponSearchRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_search")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map(toCouponSearchRow)
}

/** IDs de cupones de la emisión sin evento `viewed` — universo de "Reenviar no vistos". Cancelados quedan fuera: reenviar un cupón anulado no tiene sentido. */
export async function listUnviewedCouponIds(
  batchId: string
): Promise<string[]> {
  const supabase = await createClient()
  const { data: coupons, error: couponsError } = await supabase
    .from("coupon")
    .select("id")
    .eq("batch_id", batchId)
    .neq("status", "cancelled")
  if (couponsError) throw couponsError
  const ids = (coupons ?? []).map((c) => c.id)
  if (ids.length === 0) return []

  const { data: viewedEvents, error: eventsError } = await supabase
    .from("coupon_event")
    .select("coupon_id")
    .eq("type", "viewed")
    .in("coupon_id", ids)
  if (eventsError) throw eventsError
  const viewed = new Set((viewedEvents ?? []).map((e) => e.coupon_id))
  return ids.filter((id) => !viewed.has(id))
}

export async function getPendingApprovalsCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("coupon_approval")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
  if (error) throw error
  return count ?? 0
}
