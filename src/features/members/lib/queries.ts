import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

export type TierOption = Pick<
  Database["public"]["Tables"]["tiers"]["Row"],
  "id" | "nombre" | "multiplicador" | "umbral_puntos"
>
export type StoreOption = Pick<
  Database["public"]["Tables"]["tiendas"]["Row"],
  "id" | "nombre"
>

export type Member = Database["public"]["Tables"]["members"]["Row"] & {
  tier: TierOption | null
  enrollmentStore: StoreOption | null
}

export type MemberFilters = {
  search?: string
  accountStatus?: string
  tierId?: string
  page?: number
}

export const MEMBERS_PAGE_SIZE = 10

const MEMBER_WITH_TIER_AND_STORE =
  "*, tier:tiers(id, nombre, multiplicador, umbral_puntos), enrollmentStore:tiendas(id, nombre)"

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export async function listMembers(
  filters: MemberFilters = {}
): Promise<{ members: Member[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const from = (page - 1) * MEMBERS_PAGE_SIZE
  const to = from + MEMBERS_PAGE_SIZE - 1

  let query = supabase
    .from("members")
    .select(MEMBER_WITH_TIER_AND_STORE, { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = query.or(
      `nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%,codigo_socio.ilike.%${search}%`
    )
  }
  if (filters.accountStatus)
    query = query.eq("estado_cuenta", filters.accountStatus)
  if (filters.tierId) query = query.eq("tier_id", filters.tierId)

  const { data, error, count } = await query
  if (error) throw error

  return { members: (data ?? []) as Member[], total: count ?? 0 }
}

export async function getMemberById(id: string): Promise<Member | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_WITH_TIER_AND_STORE)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as Member | null
}

export type MemberKpis = {
  activeMembers: number
  newThisMonth: number
  withConsent: number
  totalMembers: number
  profileComplete: number
}

function startOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function getMemberKpis(): Promise<MemberKpis> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("members")
    .select(
      "estado_cuenta, creado_en, consentimiento_marketing, apellido, telefono, tipo_documento, numero_documento, fecha_nacimiento, genero, provincia, estado_civil, preferencia_compra, tiene_hijos, tiene_mascotas, tienda_inscripcion_id, canal_adquisicion"
    )
  if (error) throw error

  const rows = data ?? []
  const sinceStartOfMonth = startOfMonth()

  return {
    activeMembers: rows.filter((m) => m.estado_cuenta === "activo").length,
    newThisMonth: rows.filter((m) => m.creado_en >= sinceStartOfMonth).length,
    withConsent: rows.filter((m) => m.consentimiento_marketing).length,
    totalMembers: rows.length,
    profileComplete: rows.filter(
      (m) => calculateCompleteness(m).percentage >= 0.8
    ).length,
  }
}

const OPTIONAL_PROFILE_FIELDS = [
  "apellido",
  "telefono",
  "tipo_documento",
  "numero_documento",
  "fecha_nacimiento",
  "genero",
  "provincia",
  "estado_civil",
  "preferencia_compra",
  "tiene_hijos",
  "tiene_mascotas",
  "tienda_inscripcion_id",
  "canal_adquisicion",
] as const

type ProfileField = (typeof OPTIONAL_PROFILE_FIELDS)[number]
type MemberWithProfileFields = Pick<
  Database["public"]["Tables"]["members"]["Row"],
  ProfileField
>

export type Completeness = {
  percentage: number
  filled: number
  total: number
}

/**
 * "Perfil unificado" (05.3g) real: en vez de simular una unificación de
 * varias fuentes que no existen, mide cuántos de los atributos opcionales
 * del socio están completos — mismo espíritu (qué tan confiable es la
 * ficha), sin inventar datos.
 */
export function calculateCompleteness(
  member: MemberWithProfileFields
): Completeness {
  const filled = OPTIONAL_PROFILE_FIELDS.filter((field) => {
    const value = member[field]
    return value !== null && value !== undefined && value !== ""
  }).length
  return {
    percentage: filled / OPTIONAL_PROFILE_FIELDS.length,
    filled,
    total: OPTIONAL_PROFILE_FIELDS.length,
  }
}

export type LedgerEntryWithBalance =
  Database["public"]["Tables"]["points_ledger"]["Row"] & {
    balanceAfter: number
  }

/** "Log de redenciones" (05.3g): extracto real de `points_ledger`, con saldo acumulado calculado en memoria (la tabla solo guarda el delta de cada movimiento). */
export async function listMemberRedemptions(
  memberId: string
): Promise<LedgerEntryWithBalance[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("points_ledger")
    .select("*")
    .eq("member_id", memberId)
    .order("creado_en", { ascending: true })
  if (error) throw error

  let balance = 0
  const withBalance = (data ?? []).map((entry) => {
    balance += entry.puntos
    return { ...entry, balanceAfter: balance }
  })
  return withBalance.reverse()
}

export type Consent =
  Database["public"]["Tables"]["member_consentimientos"]["Row"]

/** "Card · Consentimientos" (05.3g), real: `member_consentimientos` por canal. Solo lectura, como en el propio Figma ("Solo lectura · Ley 1581"). */
export async function listMemberConsents(memberId: string): Promise<Consent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("member_consentimientos")
    .select("*")
    .eq("member_id", memberId)
  if (error) throw error
  return data ?? []
}

export async function listStoreOptions(): Promise<StoreOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return data
}

export async function listTiersOptions(): Promise<TierOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiers")
    .select("id, nombre, multiplicador, umbral_puntos")
    .order("orden")
  if (error) throw error
  return data
}

/**
 * COP por punto — mismo tipo de supuesto de negocio que cualquier programa
 * de lealtad real (aquí no hay un valor configurable por organización
 * todavía). Alimenta "equivalen a $X" y "Pasivo acumulado" (05.3g),
 * calculados de verdad a partir de esto en vez de inventados por socio.
 */
export const POINT_VALUE_COP = 6.75

/** Roles de sistema, no de socio: "VIP" en 05.3g se aproxima con los dos niveles superiores — no hay un motor RFM real. */
export function isVip(tierName: string | undefined): boolean {
  return tierName === "diamante" || tierName === "oro"
}

/** Diamante requiere mantener el saldo sobre su umbral — si ya cayó debajo, el badge "Riesgo de baja de nivel" (05.3g) es una señal real, no decorativa. */
export function isAtRiskOfTierDowngrade(member: Member): boolean {
  if (!member.tier) return false
  return member.saldo_puntos < member.tier.umbral_puntos
}

export function formatTenure(joinDate: string): string {
  const start = new Date(joinDate)
  const now = new Date()
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  if (now.getDate() < start.getDate()) months -= 1
  months = Math.max(0, months)
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0)
    return `${remainingMonths} mes${remainingMonths === 1 ? "" : "es"}`
  return `${years} año${years === 1 ? "" : "s"} · ${remainingMonths} mes${remainingMonths === 1 ? "" : "es"}`
}

/**
 * "Calificación cierra 31 dic" (05.3g): política real de revisión anual de
 * nivel — no hay un ciclo configurable por organización, se fija al 31 de
 * diciembre más próximo.
 */
export function getQualificationPeriod(): {
  endDate: Date
  daysRemaining: number
} {
  const now = new Date()
  let endDate = new Date(now.getFullYear(), 11, 31)
  if (endDate < now) endDate = new Date(now.getFullYear() + 1, 11, 31)
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / 86_400_000
  )
  return { endDate, daysRemaining }
}

export type LoyaltySummary = {
  pointsExpiringSoon: number
  nextExpirationDate: string | null
  redemptionRate: number | null
  accruedLiability: number
  balanceSeries: number[]
}

/** KPIs reales de "PROGRAMA DE LEALTAD" (05.3g), derivados del ledger real — sin LTV/riesgo de fuga (esos sí necesitan pedidos y scoring). */
export async function getLoyaltySummary(
  memberId: string,
  currentBalance: number
): Promise<LoyaltySummary> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("points_ledger")
    .select("tipo, puntos, expira_en, creado_en")
    .eq("member_id", memberId)
    .order("creado_en", { ascending: true })
  if (error) throw error

  const entries = data ?? []
  const now = Date.now()
  const in90Days = now + 90 * 86_400_000

  let expiringSoon = 0
  let nextExpiration: string | null = null
  let accrualSum = 0
  let redemptionSum = 0

  for (const entry of entries) {
    if (entry.tipo === "acumulacion") accrualSum += entry.puntos
    if (entry.tipo === "canje") redemptionSum += Math.abs(entry.puntos)

    if (entry.expira_en) {
      const expiresAt = new Date(entry.expira_en).getTime()
      if (expiresAt >= now && expiresAt <= in90Days && entry.puntos > 0) {
        expiringSoon += entry.puntos
        if (!nextExpiration || expiresAt < new Date(nextExpiration).getTime()) {
          nextExpiration = entry.expira_en
        }
      }
    }
  }

  let balance = 0
  const balanceSeries = entries.map((entry) => {
    balance += entry.puntos
    return balance
  })
  if (balanceSeries.length === 0)
    balanceSeries.push(currentBalance, currentBalance)

  return {
    pointsExpiringSoon: expiringSoon,
    nextExpirationDate: nextExpiration,
    redemptionRate: accrualSum > 0 ? redemptionSum / accrualSum : null,
    accruedLiability:
      Math.max(0, currentBalance - expiringSoon) * POINT_VALUE_COP,
    balanceSeries: balanceSeries.slice(-8),
  }
}

/** Tasa de redención agregada de toda la organización — el punto de comparación real de "promedio del programa" (05.3g), no un número fijo. */
export async function getProgramRedemptionRate(): Promise<number | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("points_ledger")
    .select("tipo, puntos")
  if (error) throw error

  const rows = data ?? []
  const accrued = rows
    .filter((f) => f.tipo === "acumulacion")
    .reduce((acc, f) => acc + f.puntos, 0)
  const redeemed = rows
    .filter((f) => f.tipo === "canje")
    .reduce((acc, f) => acc + Math.abs(f.puntos), 0)

  return accrued > 0 ? redeemed / accrued : null
}

const DAY_MS = 86_400_000

export type MemberOrder = {
  id: string
  tienda_id: string | null
  canal: string
  total: number
  costo_total: number
  estado: string
  creado_en: string
  tiendas: { nombre: string } | null
}

/**
 * Un solo fetch de `pedidos` del socio, compartido por
 * `getPurchaseBehavior`/`getCommercialValue` (antes cada una pedía la
 * misma tabla por su cuenta). Sin filtrar por `estado`: cada consumidora
 * decide qué estados le importan.
 */
export async function getMemberOrders(
  memberId: string
): Promise<MemberOrder[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "id, tienda_id, canal, total, costo_total, estado, creado_en, tiendas(nombre)"
    )
    .eq("member_id", memberId)
    .order("creado_en", { ascending: true })
  if (error) throw error
  return data ?? []
}

export type PurchaseBehavior = {
  totalOrders: number
  usualStore: { name: string; percentage: number } | null
  preferredChannel: { channel: string; percentage: number } | null
  monthlyFrequency: number | null
  intervalDays: number | null
  averageTicket: number
  ticketTrend: number | null
  dominantCategory: { name: string; percentage: number } | null
  lastPurchase: string | null
  nextEstimated: string | null
}

/** "Card · Comportamiento de compra" (05.3g), real: agregado de `pedidos`/`pedido_items` — vacío si el socio todavía no tiene pedidos. */
export async function getPurchaseBehavior(
  memberOrders: MemberOrder[]
): Promise<PurchaseBehavior> {
  const supabase = await createClient()
  const orders = memberOrders.filter((p) => p.estado === "completado")
  if (orders.length === 0) {
    return {
      totalOrders: 0,
      usualStore: null,
      preferredChannel: null,
      monthlyFrequency: null,
      intervalDays: null,
      averageTicket: 0,
      ticketTrend: null,
      dominantCategory: null,
      lastPurchase: null,
      nextEstimated: null,
    }
  }

  const storeCount = new Map<string, { name: string; count: number }>()
  const channelCount = new Map<string, number>()
  for (const order of orders) {
    channelCount.set(order.canal, (channelCount.get(order.canal) ?? 0) + 1)
    if (order.tienda_id) {
      const name = (order.tiendas as { nombre: string } | null)?.nombre ?? "—"
      const current = storeCount.get(order.tienda_id) ?? { name, count: 0 }
      current.count += 1
      storeCount.set(order.tienda_id, current)
    }
  }
  const topStore = [...storeCount.values()].sort((a, b) => b.count - a.count)[0]
  const topChannel = [...channelCount.entries()].sort((a, b) => b[1] - a[1])[0]

  const firstDate = new Date(orders[0].creado_en).getTime()
  const lastDate = new Date(orders[orders.length - 1].creado_en).getTime()
  const activeMonths = Math.max(1, (lastDate - firstDate) / (30 * DAY_MS))
  const monthlyFrequency =
    orders.length > 1 ? orders.length / activeMonths : null

  // Suma de intervalos consecutivos = última fecha - primera fecha
  // (telescópica): no hace falta sumar par a par.
  const intervalDays =
    orders.length > 1
      ? Math.round((lastDate - firstDate) / (orders.length - 1) / DAY_MS)
      : null

  const totalAmount = orders.reduce((acc, p) => acc + p.total, 0)
  const averageTicket = totalAmount / orders.length

  const now = Date.now()
  const recent = orders.filter(
    (p) => now - new Date(p.creado_en).getTime() <= 180 * DAY_MS
  )
  const previous = orders.filter((p) => {
    const age = now - new Date(p.creado_en).getTime()
    return age > 180 * DAY_MS && age <= 360 * DAY_MS
  })
  const recentTicket = recent.length
    ? recent.reduce((a, p) => a + p.total, 0) / recent.length
    : null
  const previousTicket = previous.length
    ? previous.reduce((a, p) => a + p.total, 0) / previous.length
    : null
  const ticketTrend =
    recentTicket !== null && previousTicket
      ? (recentTicket - previousTicket) / previousTicket
      : null

  // Categoría dominante: gasto por categoría principal del producto,
  // vía `pedido_items` → `productos` → `producto_categorias`.
  const orderIds = orders.map((p) => p.id)
  const { data: items, error: itemsError } = await supabase
    .from("pedido_items")
    .select("producto_id, subtotal")
    .in("pedido_id", orderIds)
  if (itemsError) throw itemsError

  let dominantCategory: PurchaseBehavior["dominantCategory"] = null
  const productIds = [...new Set((items ?? []).map((i) => i.producto_id))]
  if (productIds.length > 0) {
    const { data: categories, error: categoriesError } = await supabase
      .from("producto_categorias")
      .select("producto_id, categorias(nombre)")
      .eq("es_principal", true)
      .in("producto_id", productIds)
    if (categoriesError) throw categoriesError

    const categoryByProduct = new Map(
      (categories ?? []).map((c) => [
        c.producto_id,
        (c.categorias as { nombre: string } | null)?.nombre ?? "Sin categoría",
      ])
    )
    const spendByCategory = new Map<string, number>()
    for (const item of items ?? []) {
      const category =
        categoryByProduct.get(item.producto_id) ?? "Sin categoría"
      spendByCategory.set(
        category,
        (spendByCategory.get(category) ?? 0) + item.subtotal
      )
    }
    const topCategory = [...spendByCategory.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0]
    if (topCategory && totalAmount > 0) {
      dominantCategory = {
        name: topCategory[0],
        percentage: topCategory[1] / totalAmount,
      }
    }
  }

  const lastPurchase = orders[orders.length - 1].creado_en
  const nextEstimated = intervalDays
    ? new Date(
        new Date(lastPurchase).getTime() + intervalDays * DAY_MS
      ).toISOString()
    : null

  return {
    totalOrders: orders.length,
    usualStore: topStore
      ? {
          name: topStore.name,
          percentage: topStore.count / orders.length,
        }
      : null,
    preferredChannel: topChannel
      ? { channel: topChannel[0], percentage: topChannel[1] / orders.length }
      : null,
    monthlyFrequency,
    intervalDays,
    averageTicket,
    ticketTrend,
    dominantCategory,
    lastPurchase,
    nextEstimated,
  }
}

export type CommercialValue = {
  totalOrders: number
  ltv: number
  margin: number
  marginPct: number | null
  returns: number
  projectedValue12m: number
  projectedMarginValue: number
  trendPct: number
  churnRisk: number
  churnRiskDelta: number | null
  monthlySeries: number[]
}

function calculateChurnRisk(
  orders: { creado_en: string }[],
  untilMs: number
): number | null {
  const rows = orders.filter((p) => new Date(p.creado_en).getTime() <= untilMs)
  if (rows.length < 2) return null
  // Suma de intervalos consecutivos = última fecha - primera fecha
  // (telescópica): no hace falta sumar par a par.
  const firstDate = new Date(rows[0].creado_en).getTime()
  const lastDate = new Date(rows[rows.length - 1].creado_en).getTime()
  const averageInterval = (lastDate - firstDate) / (rows.length - 1)
  const daysSinceLast = untilMs - lastDate
  return Math.min(
    100,
    Math.round((daysSinceLast / (averageInterval * 2)) * 100)
  )
}

/**
 * "Sección · VALOR COMERCIAL" (05.3g), real: LTV y margen salen de
 * `pedidos`/`pedido_items`. "Valor previsto 12m" y "Riesgo de fuga" son
 * heurísticas (tendencia de gasto reciente, intervalo entre compras) — no
 * hay un modelo de scoring en este proyecto, y una heurística real es más
 * honesto que un número fijo.
 */
export async function getCommercialValue(
  memberOrders: MemberOrder[]
): Promise<CommercialValue> {
  const completed = memberOrders.filter((p) => p.estado === "completado")
  const returns = memberOrders
    .filter((p) => p.estado === "devuelto")
    .reduce((acc, p) => acc + p.total, 0)

  const ltv = completed.reduce((acc, p) => acc + p.total, 0)
  const totalCost = completed.reduce((acc, p) => acc + p.costo_total, 0)
  const margin = ltv - totalCost
  const marginPct = ltv > 0 ? margin / ltv : null

  const now = Date.now()
  const monthlySeries = Array.from({ length: 8 }, (_, i) => {
    const from = now - (8 - i) * 30 * DAY_MS
    const to = now - (7 - i) * 30 * DAY_MS
    return completed
      .filter((p) => {
        const t = new Date(p.creado_en).getTime()
        return t >= from && t < to
      })
      .reduce((acc, p) => acc + p.total, 0)
  })

  const recentAverage = monthlySeries.slice(-3).reduce((a, b) => a + b, 0) / 3
  const previousAverage =
    monthlySeries.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
  const trend = previousAverage > 0 ? recentAverage / previousAverage : 1
  const clampedTrend = Math.min(1.5, Math.max(0.5, trend))
  const projectedValue12m = Math.round(recentAverage * 12 * clampedTrend)
  const projectedMarginValue =
    marginPct !== null ? Math.round(projectedValue12m * marginPct) : 0
  const trendPct = Math.round(Math.abs(clampedTrend - 1) * 100)

  const churnRisk = calculateChurnRisk(completed, now) ?? 0
  const churnRisk30dAgo = calculateChurnRisk(completed, now - 30 * DAY_MS)
  const churnRiskDelta =
    churnRisk30dAgo !== null ? churnRisk - churnRisk30dAgo : null

  return {
    totalOrders: completed.length,
    ltv,
    margin,
    marginPct,
    returns,
    projectedValue12m,
    projectedMarginValue,
    trendPct,
    churnRisk,
    churnRiskDelta,
    monthlySeries,
  }
}
