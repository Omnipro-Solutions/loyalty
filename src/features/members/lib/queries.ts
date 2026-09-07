import { fetchAllPaged } from "@/lib/supabase/paginate"
import { createClient } from "@/lib/supabase/server"

import { cyclePayments } from "./accumulation-cycle"
import { accumulationStatus } from "./accumulation-status"
import type { Database } from "@/types/database.types"
import type { MemberSearchScope, PromotionType } from "@/types/domain"

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
  searchScope?: MemberSearchScope
  accountStatus?: string
  tierId?: string
  page?: number
  pageSize?: number
}

export const MEMBERS_PAGE_SIZE = 10

const MEMBER_WITH_TIER_AND_STORE =
  "*, tier:tiers(id, nombre, multiplicador, umbral_puntos), enrollmentStore:tiendas(id, nombre)"

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

/** Ámbito del buscador (05.1, `MEMBER_SEARCH_SCOPES`): "todos" mantiene el `.or()` sobre los 4 campos de siempre; cualquier otro valor acota a una sola columna. */
function applyMemberSearchFilter<
  T extends { or: (f: string) => T; ilike: (c: string, v: string) => T },
>(query: T, search: string, scope: MemberSearchScope): T {
  if (scope === "nombre") {
    return query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%`)
  }
  if (scope === "email") return query.ilike("email", `%${search}%`)
  if (scope === "codigo_socio")
    return query.ilike("codigo_socio", `%${search}%`)
  if (scope === "documento")
    return query.ilike("numero_documento", `%${search}%`)
  if (scope === "telefono") return query.ilike("telefono", `%${search}%`)
  return query.or(
    `nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%,codigo_socio.ilike.%${search}%`
  )
}

export type MemberExportFilters = Omit<MemberFilters, "page" | "pageSize">

/** Cascada de filtros, sin `.select()` — la comparten `buildMembersQuery`
 *  (universo con datos) y `countMembers` (conteo `head: true`, para el
 *  diálogo de export) para no repetir cada `if`. Genérico solo sobre los
 *  métodos que usa, así funciona igual sobre cualquiera de los dos
 *  `.select()`. */
function applyMemberFilters<
  T extends {
    or: (f: string) => T
    ilike: (c: string, v: string) => T
    eq: (c: string, v: string) => T
  },
>(query: T, filters: MemberExportFilters): T {
  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = applyMemberSearchFilter(
      query,
      search,
      filters.searchScope ?? "todos"
    )
  }
  if (filters.accountStatus)
    query = query.eq("estado_cuenta", filters.accountStatus)
  if (filters.tierId) query = query.eq("tier_id", filters.tierId)
  return query
}

/** `.order("id")` desempata `creado_en`: sin un desempate único, paginar con
 *  `.range()` en llamadas separadas puede repetir o saltar filas entre
 *  páginas. Compartida por `listMembers` (paginado) y `listAllMembers`
 *  (universo completo para export). */
function buildMembersQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: MemberExportFilters
) {
  const query = supabase
    .from("members")
    .select(MEMBER_WITH_TIER_AND_STORE, { count: "exact" })
    .order("creado_en", { ascending: false })
    .order("id")

  return applyMemberFilters(query, filters)
}

/** Conteo de filas que matchean los filtros, sin traer datos — para el
 *  diálogo de export ("vas a exportar N clientes") antes de pedir el
 *  universo completo. */
export async function countMembers(
  filters: MemberExportFilters
): Promise<number> {
  const supabase = await createClient()
  const query = supabase
    .from("members")
    .select("id", { count: "exact", head: true })
  const { count, error } = await applyMemberFilters(query, filters)
  if (error) throw error
  return count ?? 0
}

export async function listMembers(
  filters: MemberFilters = {}
): Promise<{ members: Member[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? MEMBERS_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await buildMembersQuery(
    supabase,
    filters
  ).range(from, to)
  if (error) throw error

  return { members: (data ?? []) as Member[], total: count ?? 0 }
}

/** Universo completo filtrado, para "Exportar" (05.1) — sin la paginación
 *  de `listMembers`. */
export async function listAllMembers(filters: MemberExportFilters) {
  const supabase = await createClient()
  const { rows, total, truncated } = await fetchAllPaged<Member>((from, to) =>
    buildMembersQuery(supabase, filters).range(from, to)
  )
  return { members: rows, total, truncated }
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
  currentBalance: number,
  pointValueUsd: number
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
      Math.max(0, currentBalance - expiringSoon) * pointValueUsd,
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
  /** Top 2 categorías por gasto, sin "Sin categoría" — real, mismo cálculo que `dominantCategory` (05.3g hero "Etiquetas"). */
  topCategoryNames: string[]
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
      topCategoryNames: [],
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
  let topCategoryNames: string[] = []
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
    const rankedCategories = [...spendByCategory.entries()].sort(
      (a, b) => b[1] - a[1]
    )
    const topCategory = rankedCategories[0]
    if (topCategory && totalAmount > 0) {
      dominantCategory = {
        name: topCategory[0],
        percentage: topCategory[1] / totalAmount,
      }
    }
    topCategoryNames = rankedCategories
      .map(([name]) => name)
      .filter((name) => name !== "Sin categoría")
      .slice(0, 2)
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
    topCategoryNames,
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

  /**
   * Lo que volvió al mostrador. Antes esto se leía solo de `pedidos.estado`,
   * así que una devolución PARCIAL no existía para este KPI: el socio traía
   * de vuelta una de tres cajas y la ficha seguía diciendo "devoluciones
   * $0", con el pedido entero contando como venta. `devoluciones` sí las
   * tiene línea por línea, y `costo_devuelto` es lo que permite que el
   * margen no siga cargando el costo de un producto que está de vuelta en
   * el estante.
   *
   * Si la tabla todavía no existe (migración sin aplicar) el KPI se queda en
   * cero, que es exactamente lo que mostraba antes.
   */
  const returnsByOrder = new Map<string, { valor: number; costo: number }>()
  if (memberOrders.length > 0) {
    const supabase = await createClient()
    const { data: devueltos, error: errorDevueltos } = await supabase
      .from("devoluciones")
      .select("pedido_id, total_devuelto, costo_devuelto")
      .in(
        "pedido_id",
        memberOrders.map((p) => p.id)
      )
    if (!errorDevueltos) {
      for (const row of devueltos ?? []) {
        const acumulado = returnsByOrder.get(row.pedido_id) ?? {
          valor: 0,
          costo: 0,
        }
        returnsByOrder.set(row.pedido_id, {
          valor: acumulado.valor + row.total_devuelto,
          costo: acumulado.costo + row.costo_devuelto,
        })
      }
    }
  }

  const returns = [...returnsByOrder.values()].reduce(
    (acc, row) => acc + row.valor,
    0
  )
  // De un pedido `devuelto` no se cuenta nada: ya quedó fuera de `completed`.
  // De uno `completado` con devolución parcial se descuenta lo que volvió —
  // si no, se contaría dos veces: como venta y como devolución.
  const parcial = completed.reduce(
    (acc, p) => {
      const row = returnsByOrder.get(p.id)
      if (!row) return acc
      return { valor: acc.valor + row.valor, costo: acc.costo + row.costo }
    },
    { valor: 0, costo: 0 }
  )

  const ltv = completed.reduce((acc, p) => acc + p.total, 0) - parcial.valor
  const totalCost =
    completed.reduce((acc, p) => acc + p.costo_total, 0) - parcial.costo
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

export type RfmProfile = {
  label: string
  /** [recencia, frecuencia, monetario], 1-5 — "Campeón · 5-5-4" (05.3g hero). */
  scores: [number, number, number]
}

const RFM_LABEL_BANDS: { min: number; label: string }[] = [
  { min: 4.5, label: "Campeón" },
  { min: 3.5, label: "Cliente leal" },
  { min: 2.5, label: "En desarrollo" },
  { min: 1.5, label: "En riesgo" },
  { min: 0, label: "Hibernando" },
]

function rfmRank(value: number, allValues: number[]): number {
  const sorted = [...allValues].sort((a, b) => a - b)
  const position = sorted.filter((v) => v <= value).length
  return Math.max(1, Math.min(5, Math.ceil((position / sorted.length) * 5)))
}

/**
 * "Segmento RFM" (05.3g hero "PERFIL COMERCIAL") real: recency/frequency/
 * monetary de `pedidos` completados de TODA la organización, puntuados 1-5
 * por ranking relativo entre los socios que sí tienen pedidos — no hay un
 * modelo de scoring importado en este proyecto, mismo espíritu que
 * "Riesgo de fuga"/"Valor previsto 12m" en `getCommercialValue`. Con pocos
 * socios con historial, el "quintil" es aproximado, no estadísticamente
 * puro — pero es un ranking real, no un número inventado por socio.
 * `null` si el socio no tiene ningún pedido completado.
 */
export async function getRfmProfile(
  memberId: string
): Promise<RfmProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pedidos")
    .select("member_id, total, creado_en")
    .eq("estado", "completado")
  if (error) throw error

  const byMember = new Map<
    string,
    { count: number; total: number; lastOrderMs: number }
  >()
  for (const row of data ?? []) {
    const current = byMember.get(row.member_id) ?? {
      count: 0,
      total: 0,
      lastOrderMs: 0,
    }
    current.count += 1
    current.total += row.total
    current.lastOrderMs = Math.max(
      current.lastOrderMs,
      new Date(row.creado_en).getTime()
    )
    byMember.set(row.member_id, current)
  }

  const target = byMember.get(memberId)
  if (!target) return null

  const all = [...byMember.values()]
  const recencyScore = rfmRank(
    target.lastOrderMs,
    all.map((m) => m.lastOrderMs)
  )
  const frequencyScore = rfmRank(
    target.count,
    all.map((m) => m.count)
  )
  const monetaryScore = rfmRank(
    target.total,
    all.map((m) => m.total)
  )

  const average = (recencyScore + frequencyScore + monetaryScore) / 3
  const label =
    RFM_LABEL_BANDS.find((band) => average >= band.min)?.label ?? "Hibernando"

  return { label, scores: [recencyScore, frequencyScore, monetaryScore] }
}

export type MemberAudienceRow = {
  id: string
  nombre: string
  codigo: string
  conteoEstimado: number | null
  estado: string
  sincronizadoConAjo: boolean
  actualizadaEn: string
}

/**
 * "Card · Audiencias activas" (1125:4791) real: `segment_members` es una
 * muestra curada de quién cumple hoy la condición de cada segmento (no el
 * universo completo — ver comentario de la tabla en la migración), pero la
 * fila en sí es verídica: si el socio aparece aquí, SÍ está en esa
 * audiencia. No hay columna "origen" en `segments` (Figma la muestra como
 * "POS Centro"/"Modelo IA"/etc., sin respaldo real) — se usa
 * `sincronizado_con_ajo` como proxy real de origen (AJO vs. manual).
 */
export async function listMemberAudiences(
  memberId: string
): Promise<MemberAudienceRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("segment_members")
    .select(
      "segment:segments(id, nombre, codigo, conteo_estimado, estado, sincronizado_con_ajo, ultima_sincronizacion_en, actualizado_en)"
    )
    .eq("member_id", memberId)
  if (error) throw error

  return (data ?? [])
    .map((row) => row.segment)
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .map((s) => ({
      id: s.id,
      nombre: s.nombre,
      codigo: s.codigo,
      conteoEstimado: s.conteo_estimado,
      estado: s.estado,
      sincronizadoConAjo: s.sincronizado_con_ajo,
      actualizadaEn: s.ultima_sincronizacion_en ?? s.actualizado_en,
    }))
    .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn))
}

/** Ids de categoría raíz que el socio ha comprado — resuelve un nivel de `categorias.parent_id`, para el match honesto de condiciones de categoría en promociones (sin inventar el vínculo si no hay compra real en esa categoría). */
async function getPurchasedRootCategoryIds(
  memberOrders: MemberOrder[]
): Promise<Set<string>> {
  const completedIds = memberOrders
    .filter((o) => o.estado === "completado")
    .map((o) => o.id)
  if (completedIds.length === 0) return new Set()

  const supabase = await createClient()
  const { data: items, error: itemsError } = await supabase
    .from("pedido_items")
    .select("producto_id")
    .in("pedido_id", completedIds)
  if (itemsError) throw itemsError

  const productIds = [...new Set((items ?? []).map((i) => i.producto_id))]
  if (productIds.length === 0) return new Set()

  const { data: categories, error: categoriesError } = await supabase
    .from("producto_categorias")
    .select("categorias(id, parent_id)")
    .eq("es_principal", true)
    .in("producto_id", productIds)
  if (categoriesError) throw categoriesError

  const roots = new Set<string>()
  for (const row of categories ?? []) {
    const categoria = row.categorias as {
      id: string
      parent_id: string | null
    } | null
    if (categoria) roots.add(categoria.parent_id ?? categoria.id)
  }
  return roots
}

type PromotionCondition =
  | { campo: "producto"; valor: string[] }
  | { campo: "categoria"; valor: string[] }
  | { campo: "tienda"; valor: string }
  | { campo: "segmento"; valor: string }
  | { campo: "monto_carrito"; valor: number }
type PromotionConditionNode =
  | PromotionCondition
  | { combinador: "todas" | "alguna"; condiciones: PromotionConditionNode[] }

/**
 * `promociones.condiciones` es un árbol de grupos Y/O anidados (ver
 * `features/promotions/lib/condition-tree.ts`), no un array plano —
 * aplana recursivamente para recolectar todas las hojas. Copia mínima
 * duplicada por aislamiento entre features (CLAUDE.md §2).
 */
function flattenPromotionConditions(
  node: PromotionConditionNode
): PromotionCondition[] {
  if ("condiciones" in node)
    return node.condiciones.flatMap(flattenPromotionConditions)
  return [node]
}

export type MemberPromotionCondition =
  | { campo: "segmento" }
  | { campo: "categoria"; matchesPurchaseHistory: boolean }
  | { campo: "monto_carrito"; threshold: number }
  | { campo: "tienda"; valor: string }
  | null

export type MemberPromotionRow = {
  id: string
  nombre: string
  codigo: string
  tipo: PromotionType
  canalAplicacion: string
  status: "activa" | "programada"
  vigenteDesde: string
  vigenteHasta: string | null
  presupuestoAsignado: number
  presupuestoConsumido: number
  condition: MemberPromotionCondition
  /** Viene de `member_promociones` — un gestor la habilitó a mano ("Enviar promoción" del Hero), no de la elegibilidad por segmento/categoría de abajo. */
  assignedManually: boolean
}

/** Para el picker de "Enviar promoción": promociones activas que un gestor puede asignar a mano, salteando la elegibilidad por segmento/categoría (ese es el punto del override). */
export type AssignablePromotion = {
  id: string
  nombre: string
  codigo: string
  tipo: PromotionType
  yaAsignada: boolean
}

/** Duplicado de `features/promotions/lib/status.ts` por aislamiento entre features (CLAUDE.md §2) — mismo cálculo, solo los dos estados que le importan a esta tarjeta. */
function promotionValidity(promotion: {
  estado_publicacion: string
  vigente_desde: string
  vigente_hasta: string | null
}): "borrador" | "programada" | "activa" | "inactiva" | "finalizada" {
  const dateOnly = (value: string | Date) => {
    const d = typeof value === "string" ? new Date(value) : value
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  }
  // Solo 'activa' se cruza con las fechas: `borrador`/`inactiva`/
  // `finalizada` son decisiones explícitas del operador y esta tarjeta las
  // descarta igual (filtra a activa/programada más abajo).
  if (promotion.estado_publicacion !== "activa") {
    return promotion.estado_publicacion as
      "borrador" | "inactiva" | "finalizada"
  }
  const today = dateOnly(new Date())
  const start = dateOnly(promotion.vigente_desde)
  const end = promotion.vigente_hasta ? dateOnly(promotion.vigente_hasta) : null
  if (start > today) return "programada"
  if (end !== null && end < today) return "finalizada"
  return "activa"
}

/** IDs de `member_promociones` para un socio — comparte la consulta entre `listActivePromotionsForMember` y `listPromotionsForManualAssignment`. */
async function getManuallyAssignedPromotionIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("member_promociones")
    .select("promocion_id")
    .eq("member_id", memberId)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.promocion_id))
}

/**
 * "Card · Promociones activas" (1125:4724) real, con matices documentados
 * en el plan de esta tarea:
 * - Filtra por vigencia real (`promotionValidity`, duplicado de
 *   `promotions/lib/status.ts`) a activa/programada.
 * - La condición `segmento` SÍ excluye de verdad si el socio no está en
 *   `segment_members` para ese segmento. El seed tiene un bug conocido
 *   (`PROMO-VIP-15` guarda el string `'VIP'` en vez de un id de segmento,
 *   igual que el tipo `Condition` de `features/promotions` esperaría) — se
 *   resuelve por id y, si falla, por `nombre` conteniendo el valor, mismo
 *   criterio defensivo que ya usan `scope.ts`/`promotion-summary-card.tsx`
 *   en el propio módulo de Promociones.
 * - Las condiciones de categoría/carrito NO excluyen — son informativas
 *   (el propio Figma trata "Envío gratis" como "Disponible" con el ticket
 *   medio por debajo del umbral). Se anota si el historial real de compra
 *   coincide, sin inventar el dato si el socio no tiene pedidos.
 * - `usos_por_cliente` no se verifica: no existe tabla de canjes por socio.
 */
export async function listActivePromotionsForMember(
  memberId: string,
  memberOrders: MemberOrder[],
  manuallyAssignedIds?: Set<string>
): Promise<MemberPromotionRow[]> {
  const supabase = await createClient()
  // `promotionValidity` descarta cualquier fila con `estado_publicacion`
  // distinto de 'activa' (candidates más abajo solo se queda con
  // status 'activa'/'programada', y ambos exigen estado_publicacion ===
  // 'activa') — empujar ese filtro a SQL es equivalente y evita traer
  // borradores/inactivas/finalizadas y columnas no usadas en cada carga
  // del detalle de socio.
  const { data, error } = await supabase
    .from("promociones")
    .select(
      "id, nombre, codigo, tipo, canal_aplicacion, condiciones, estado_publicacion, vigente_desde, vigente_hasta, presupuesto_asignado, presupuesto_consumido"
    )
    .eq("estado_publicacion", "activa")
  if (error) throw error

  const candidates = (data ?? [])
    .map((row) => ({
      row,
      condiciones: row.condiciones
        ? flattenPromotionConditions(row.condiciones as PromotionConditionNode)
        : [],
      status: promotionValidity(row),
    }))
    .filter(
      (c): c is typeof c & { status: "activa" | "programada" } =>
        c.status === "activa" || c.status === "programada"
    )
  if (candidates.length === 0) return []

  const hasSegmentCondition = candidates.some((c) =>
    c.condiciones.some((cond) => cond.campo === "segmento")
  )
  let memberSegmentIds = new Set<string>()
  let memberSegmentNames: string[] = []
  if (hasSegmentCondition) {
    const { data: segRows, error: segError } = await supabase
      .from("segment_members")
      .select("segment_id, segment:segments(nombre)")
      .eq("member_id", memberId)
    if (segError) throw segError
    memberSegmentIds = new Set((segRows ?? []).map((r) => r.segment_id))
    memberSegmentNames = (segRows ?? [])
      .map((r) => r.segment?.nombre)
      .filter((n): n is string => !!n)
  }

  const memberMatchesSegment = (segmentValue: string): boolean => {
    if (memberSegmentIds.has(segmentValue)) return true
    const needle = segmentValue.toLowerCase()
    return memberSegmentNames.some((name) =>
      name.toLowerCase().includes(needle)
    )
  }

  const hasCategoryCondition = candidates.some((c) =>
    c.condiciones.some((cond) => cond.campo === "categoria")
  )
  const purchasedRootCategoryIds = hasCategoryCondition
    ? await getPurchasedRootCategoryIds(memberOrders)
    : new Set<string>()

  const assignedIds =
    manuallyAssignedIds ??
    (await getManuallyAssignedPromotionIds(supabase, memberId))

  const rows: MemberPromotionRow[] = []
  for (const { row, condiciones, status } of candidates) {
    const segmentCondition = condiciones.find((c) => c.campo === "segmento")
    if (segmentCondition && !memberMatchesSegment(segmentCondition.valor)) {
      continue
    }

    const categoryCondition = condiciones.find((c) => c.campo === "categoria")
    const cartCondition = condiciones.find((c) => c.campo === "monto_carrito")
    const storeCondition = condiciones.find((c) => c.campo === "tienda")

    let condition: MemberPromotionCondition = null
    if (segmentCondition) {
      condition = { campo: "segmento" }
    } else if (categoryCondition) {
      condition = {
        campo: "categoria",
        matchesPurchaseHistory: categoryCondition.valor.some((id) =>
          purchasedRootCategoryIds.has(id)
        ),
      }
    } else if (cartCondition) {
      condition = { campo: "monto_carrito", threshold: cartCondition.valor }
    } else if (storeCondition) {
      condition = { campo: "tienda", valor: storeCondition.valor }
    }

    rows.push({
      id: row.id,
      nombre: row.nombre,
      codigo: row.codigo,
      tipo: row.tipo as PromotionType,
      canalAplicacion: row.canal_aplicacion,
      status,
      vigenteDesde: row.vigente_desde,
      vigenteHasta: row.vigente_hasta,
      presupuestoAsignado: row.presupuesto_asignado,
      presupuestoConsumido: row.presupuesto_consumido,
      condition,
      assignedManually: assignedIds.has(row.id),
    })
  }

  return rows
}

/**
 * Picker de "Enviar promoción" (Hero, 05.3g): a diferencia de
 * `listActivePromotionsForMember`, no filtra por elegibilidad de
 * segmento/categoría — un gestor puede asignar cualquier promoción activa a
 * mano, ese es el punto del override. Solo marca cuáles ya están asignadas
 * (vía `member_promociones`) para deshabilitarlas en el picker.
 */
export async function listPromotionsForManualAssignment(
  memberId: string
): Promise<AssignablePromotion[]> {
  const supabase = await createClient()
  const [{ data: promotions, error: promotionsError }, assignedIds] =
    await Promise.all([
      supabase
        .from("promociones")
        .select("id, nombre, codigo, tipo")
        .eq("estado_publicacion", "activa")
        .order("nombre"),
      getManuallyAssignedPromotionIds(supabase, memberId),
    ])
  if (promotionsError) throw promotionsError

  return (promotions ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    tipo: p.tipo as PromotionType,
    yaAsignada: assignedIds.has(p.id),
  }))
}

export type { AccumulationStatus } from "./accumulation-statuses"
import {
  ACCUMULATION_STATUSES,
  type AccumulationStatus,
} from "./accumulation-statuses"

/** Una mecánica `por_piezas` (3x2, 2x1…) y lo que el socio lleva acumulado en ella. */
/**
 * De dónde salió cada pieza: la compra que la trajo o la devolución que la
 * quitó. Es lo que hace auditable el número grande de la tarjeta — «lleva
 * 3» sin poder ver las tres compras es un número que hay que creer.
 *
 * `piezas` es lo que ese movimiento aportó (o restó) al ciclo, no la
 * cantidad de la línea: de un pedido con 4 unidades donde se devolvió 1, la
 * compra aporta 4 y la devolución resta 1.
 */
export type AccumulationMovement = {
  tipo: "compra" | "devolucion"
  /** `PED-77850` o `DEV-2026-006`, que es lo que se busca en el log. */
  referencia: string
  fecha: string
  piezas: number
  importe: number
  /** Solo en compras. */
  canal: string | null
  /** Solo en devoluciones — el `motivo` crudo, la etiqueta la pone la UI. */
  motivo: string | null
}

export type MemberAccumulationRow = {
  /** Quién acumula. Redundante en la ficha; imprescindible en la vista transversal. */
  memberId: string
  socioNombre: string
  socioCodigo: string | null
  promocionId: string
  promocionNombre: string
  promocionCodigo: string
  vigenteHasta: string | null
  /** `null` cuando el ciclo se cumple mezclando la categoría entera (`misma_categoria`). */
  productoId: string | null
  sku: string | null
  nombre: string
  presentacion: string | null
  imagenUrl: string | null
  precio: number
  /** `compra_cantidad`: piezas del ciclo. Y las que se pagan de ellas. */
  compraCantidad: number
  pagaCantidad: number
  /** Las que salen gratis por ciclo: `compraCantidad - pagaCantidad`. */
  piezasGratisPorCiclo: number
  /**
   * Piezas que cuentan: lo comprado dentro de la vigencia MENOS lo devuelto.
   * Es el número que responde «¿cuántas llevo?», y el que hay que enseñar
   * antes que cualquier otro — el resto de la tarjeta se deriva de él.
   */
  unidadesCompradas: number
  /** Piezas que volvieron al mostrador. Ya restadas de `unidadesCompradas`. */
  unidadesDevueltas: number
  /**
   * Las compras y devoluciones que produjeron este avance, de la más
   * reciente a la más antigua. Solo las de ESTE grupo: el mismo socio puede
   * tener otra acumulación del mismo pedido con otro producto.
   */
  movimientos: AccumulationMovement[]
  gastoAcumulado: number
  unidadesEnCiclo: number
  /** Lo que falta para el siguiente regalo. `0` cuando el ciclo se acaba de completar. */
  faltan: number
  /**
   * Lo pagado por cada pieza del ciclo en curso, en orden de compra, con un
   * `0` por cada pieza que falta — longitud siempre `compraCantidad`. Es lo
   * que el "Proceso" pinta bajo cada nodo: el importe por pieza, no el
   * acumulado.
   */
  pagosEnCiclo: number[]
  piezasGratis: number
  ahorro: number
  estado: AccumulationStatus
  /** Ciclos completados cuyo beneficio no se ha canjeado todavía. */
  piezasPorReclamar: number
  /** Días hasta el fin de la vigencia. `null` si es permanente o ya terminó. */
  diasRestantes: number | null
}

/**
 * "Acumulaciones" (05.3): en qué mecánicas de pieza gratis va avanzando el
 * socio y cuánto le falta. Es la vista que el cliente final ve en su cuenta
 * ("3x2 en Catálogo de Benzocaína: faltan 2") y la que el operador necesita
 * para responder «¿cuánto me falta?» sin hacer la cuenta a mano.
 *
 * Se DERIVA de compras reales (`pedido_items` dentro de la vigencia); no hay
 * tabla de progreso ni hace falta: inventar una obligaría a mantenerla
 * sincronizada con cada pedido, y el dato ya está.
 *
 * Se filtra por `tipo_beneficio = 'por_piezas'` y no por `tipo`: `tipo` es la
 * taxonomía comercial (una 3x2 se cataloga como `cantidad`), pero lo que
 * hace que exista un ciclo acumulable es la mecánica. Y las piezas gratis
 * salen de `compra_cantidad - paga_cantidad`, no de `cantidad_regalo`, que
 * es de otra mecánica y en estas promociones va en `null`.
 *
 * `alcance_piezas` decide la unidad de acumulación, que es lo que cambia lo
 * que se muestra:
 *   · `mismo_producto` / `producto_especifico` → el ciclo se cumple dentro de
 *     cada SKU, así que hay una tarjeta por SKU.
 *   · `misma_categoria` → las piezas se mezclan en todo el universo, así que
 *     hay UNA tarjeta por promoción. Partirla por SKU diría que faltan 2 de
 *     cada uno cuando en realidad faltan 2 en total.
 */
/** Aplica el `.eq()` del socio solo si hay socio: la vista transversal no lo lleva. */
function applyMemberFilter<
  T extends { eq: (column: string, value: string) => T },
>(query: T, column: string, memberId?: string): T {
  return memberId ? query.eq(column, memberId) : query
}

export type AccumulationFilters = {
  /** Un socio concreto, o todos cuando se omite (la vista transversal). */
  memberId?: string
  estados?: AccumulationStatus[]
  promocionId?: string
}

export async function listMemberAccumulations(
  memberId: string
): Promise<MemberAccumulationRow[]> {
  return listAccumulations({ memberId })
}

/**
 * Las acumulaciones de la organización, o las de un socio. Es la misma
 * derivación de siempre —compras reales contra la mecánica— con el filtro
 * abierto: la ficha pide `memberId`, y la pestaña «Acumulaciones» de
 * Clientes no, porque su pregunta es «¿quién está cerca?».
 *
 * Sin `memberId` cada fila necesita saber DE QUIÉN es, así que se resuelve
 * el socio de cada pedido — en la ficha eso era redundante y por eso no
 * estaba.
 */
export async function listAccumulations(
  filters: AccumulationFilters = {}
): Promise<MemberAccumulationRow[]> {
  const memberId = filters.memberId
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const promoQuery = supabase
    .from("promociones")
    .select(
      `id, nombre, codigo, condiciones, compra_cantidad, paga_cantidad,
       alcance_piezas, producto_comprado_id, vigente_desde, vigente_hasta,
       estado_publicacion, presupuesto_asignado, presupuesto_consumido`
    )
    .eq("tipo_beneficio", "por_piezas")
    .lte("vigente_desde", today)

  const { data: promos } = await (filters.promocionId
    ? promoQuery.eq("id", filters.promocionId)
    : promoQuery)

  // No se filtra por estado ni por vigencia: una promoción vencida o retirada
  // con piezas a medias ES uno de los casos que hay que mostrar. Lo único que
  // se descarta es lo que nunca pudo acumular (un borrador, o una mecánica
  // mal configurada donde no se regala nada).
  const candidatas = (promos ?? []).filter(
    (p) =>
      p.estado_publicacion !== "borrador" &&
      p.estado_publicacion !== "pendiente_aprobacion" &&
      (p.compra_cantidad ?? 0) > (p.paga_cantidad ?? 0)
  )
  if (candidatas.length === 0) return []

  // El universo de cada promoción: los SKU cuyas piezas cuentan para su ciclo.
  const universes = new Map<string, string[]>()
  const categoryIds = new Set<string>()
  for (const promo of candidatas) {
    if (promo.alcance_piezas === "producto_especifico") {
      universes.set(
        promo.id,
        promo.producto_comprado_id ? [promo.producto_comprado_id] : []
      )
      continue
    }
    const leaves = promo.condiciones
      ? flattenPromotionConditions(promo.condiciones as PromotionConditionNode)
      : []
    const ids: string[] = []
    for (const leaf of leaves) {
      if (leaf.campo === "producto") ids.push(...leaf.valor)
      if (leaf.campo === "categoria") {
        for (const c of leaf.valor) categoryIds.add(c)
      }
    }
    universes.set(promo.id, ids)
  }

  // "Catálogo de Benzocaína" es una categoría: sus productos son el universo.
  if (categoryIds.size > 0) {
    const { data: enlaces } = await supabase
      .from("producto_categorias")
      .select("producto_id, categoria_id")
      .in("categoria_id", [...categoryIds])

    for (const promo of candidatas) {
      if (promo.alcance_piezas === "producto_especifico") continue
      const leaves = promo.condiciones
        ? flattenPromotionConditions(
            promo.condiciones as PromotionConditionNode
          )
        : []
      const cats = new Set(
        leaves.flatMap((l) => (l.campo === "categoria" ? l.valor : []))
      )
      if (cats.size === 0) continue
      const extra = (enlaces ?? [])
        .filter((e) => cats.has(e.categoria_id))
        .map((e) => e.producto_id)
      universes.set(promo.id, [
        ...new Set([...(universes.get(promo.id) ?? []), ...extra]),
      ])
    }
  }

  const productoIds = [...new Set([...universes.values()].flat())]
  if (productoIds.length === 0) return []

  const [{ data: items }, { data: productos }, { data: canjes }] =
    await Promise.all([
      applyMemberFilter(
        supabase
          .from("pedido_items")
          .select(
            `id, producto_id, cantidad, subtotal,
             pedido:pedidos!inner(
               numero_pedido, member_id, creado_en, estado, canal,
               socio:members!member_id(nombre, apellido, codigo_socio)
             )`
          )
          .in("producto_id", productoIds),
        "pedido.member_id",
        memberId
      ),
      supabase
        .from("productos")
        .select("id, sku, nombre, presentacion, imagen_url, precio")
        .in("id", productoIds),
      // Un ciclo completo no significa que el socio ya se llevó la pieza: eso
      // lo dice un evento de canje suyo sobre esa promoción. Sin este cruce,
      // "por reclamar" y "ya reclamado" se verían igual — y son justo los dos
      // que hay que distinguir para saber a quién llamar.
      applyMemberFilter(
        supabase
          .from("promocion_eventos")
          .select("promocion_id, member_id")
          .eq("tipo", "canje")
          .in(
            "promocion_id",
            candidatas.map((p) => p.id)
          ),
        "member_id",
        memberId
      ),
    ])

  /**
   * Lo que volvió al mostrador, por línea de pedido. Una pieza devuelta no
   * acumula: si de tres cajas el socio trajo una de vuelta, el ciclo de la
   * 3x2 NO está cumplido y la promoción no debe regalar nada. Sin este cruce
   * la vista contaba las tres y prometía un beneficio que ya no se ganó.
   *
   * Se pide después y no dentro del `Promise.all` porque depende de los ids
   * de línea que devuelve la consulta anterior. Y si la tabla todavía no
   * existe (migración sin aplicar) se sigue sin devoluciones en vez de
   * reventar la pantalla, igual que hace el log con `workflow_status_events`.
   */
  const itemIds = (items ?? []).map((item) => item.id)
  const devueltoPorLinea = new Map<string, number>()
  /**
   * La devolución completa y no solo su cantidad: la tarjeta despliega de
   * dónde salió cada pieza, y «−1 pieza» sin número ni motivo no explica
   * nada. Una misma línea puede tener dos devoluciones (dos visitas al
   * mostrador), así que se guarda una lista por línea.
   */
  const devolucionesPorLinea = new Map<
    string,
    { referencia: string; fecha: string; motivo: string; piezas: number }[]
  >()
  if (itemIds.length > 0) {
    const { data: devueltos, error: errorDevueltos } = await supabase
      .from("devolucion_items")
      .select(
        `pedido_item_id, cantidad,
         devolucion:devoluciones!devolucion_id(
           numero_devolucion, motivo, creado_en
         )`
      )
      .in("pedido_item_id", itemIds)
    if (!errorDevueltos) {
      for (const row of devueltos ?? []) {
        devueltoPorLinea.set(
          row.pedido_item_id,
          (devueltoPorLinea.get(row.pedido_item_id) ?? 0) + row.cantidad
        )
        if (!row.devolucion) continue
        devolucionesPorLinea.set(row.pedido_item_id, [
          ...(devolucionesPorLinea.get(row.pedido_item_id) ?? []),
          {
            referencia: row.devolucion.numero_devolucion,
            fecha: row.devolucion.creado_en,
            motivo: row.devolucion.motivo,
            piezas: row.cantidad,
          },
        ])
      }
    }
  }

  // Por (socio, promoción): con la vista transversal, contarlos solo por
  // promoción mezclaría los canjes de unas personas con los ciclos de otras.
  const canjesPorSocioPromo = new Map<string, number>()
  for (const row of canjes ?? []) {
    if (!row.member_id) continue
    const key = `${row.member_id}:${row.promocion_id}`
    canjesPorSocioPromo.set(key, (canjesPorSocioPromo.get(key) ?? 0) + 1)
  }

  const productoById = new Map((productos ?? []).map((p) => [p.id, p]))
  const rows: MemberAccumulationRow[] = []

  for (const promo of candidatas) {
    const universo = universes.get(promo.id) ?? []
    if (universo.length === 0) continue

    const compraCantidad = promo.compra_cantidad ?? 0
    const pagaCantidad = promo.paga_cantidad ?? 0
    const gratisPorCiclo = compraCantidad - pagaCantidad

    // Compras dentro de la vigencia. Piezas anteriores al arranque no
    // cuentan, y un pedido cancelado nunca se entregó: no hay pieza que
    // acumular (el devuelto sí entra, y se descuenta línea por línea abajo).
    const enVentana = (items ?? [])
      .filter(
        (item) =>
          universo.includes(item.producto_id) &&
          !!item.pedido?.member_id &&
          item.pedido.estado !== "cancelado" &&
          item.pedido.creado_en >= promo.vigente_desde &&
          (!promo.vigente_hasta || item.pedido.creado_en <= promo.vigente_hasta)
      )
      .sort((a, b) =>
        (a.pedido?.creado_en ?? "") < (b.pedido?.creado_en ?? "") ? -1 : 1
      )
    if (enVentana.length === 0) continue

    // Cada socio acumula por su cuenta: sin este corte, la vista transversal
    // sumaría las piezas de toda la organización en un solo ciclo.
    const porSocio = new Map<string, typeof enVentana>()
    for (const item of enVentana) {
      const id = item.pedido?.member_id
      if (!id) continue
      porSocio.set(id, [...(porSocio.get(id) ?? []), item])
    }

    for (const [socioId, comprado] of porSocio) {
      const socio = comprado[0]?.pedido?.socio
      const mezcla = promo.alcance_piezas === "misma_categoria"
      const grupos = mezcla
        ? [{ productoId: null, lineas: comprado }]
        : [...new Set(comprado.map((i) => i.producto_id))].map(
            (productoId) => ({
              productoId,
              lineas: comprado.filter((i) => i.producto_id === productoId),
            })
          )

      for (const grupo of grupos) {
        // Una pieza por unidad: una línea con `cantidad: 3` son tres nodos del
        // "Proceso", no uno. Y lo devuelto se descuenta de su propia línea:
        // el precio por pieza sigue siendo el de esa venta
        // (`subtotal / cantidad` es el `precio_unitario` de entonces), pero
        // las piezas que volvieron no acumulan.
        let devueltas = 0
        const movimientos: AccumulationMovement[] = []
        const piezas = grupo.lineas.flatMap((item) => {
          const devuelto = Math.min(
            devueltoPorLinea.get(item.id) ?? 0,
            item.cantidad
          )
          devueltas += devuelto

          if (item.pedido) {
            movimientos.push({
              tipo: "compra",
              referencia: item.pedido.numero_pedido,
              fecha: item.pedido.creado_en,
              piezas: item.cantidad,
              importe: item.subtotal,
              canal: item.pedido.canal,
              motivo: null,
            })
          }
          for (const dev of devolucionesPorLinea.get(item.id) ?? []) {
            movimientos.push({
              tipo: "devolucion",
              referencia: dev.referencia,
              fecha: dev.fecha,
              piezas: dev.piezas,
              // El precio de la pieza es el de esa venta, no el de hoy.
              importe: (item.subtotal / item.cantidad) * dev.piezas,
              canal: null,
              motivo: dev.motivo,
            })
          }

          return Array.from(
            { length: item.cantidad - devuelto },
            () => item.subtotal / item.cantidad
          )
        })
        const unidades = piezas.length
        // Todo lo de este grupo volvió al mostrador: no hay acumulación que
        // contar, y una tarjeta en 0/3 solo sería ruido.
        if (unidades === 0) continue
        const enCiclo = unidades % compraCantidad
        const ciclos = Math.floor(unidades / compraCantidad)

        // Los canjes son por promoción, no por SKU: cuando hay varias tarjetas
        // de la misma promoción se reparten en orden, sin inventar de dónde
        // salió cada uno.
        const canjeKey = `${socioId}:${promo.id}`
        const yaCanjeados = canjesPorSocioPromo.get(canjeKey) ?? 0
        const ganados = ciclos * gratisPorCiclo
        const porReclamar = Math.max(0, ganados - yaCanjeados)
        canjesPorSocioPromo.set(canjeKey, Math.max(0, yaCanjeados - ganados))

        const diasRestantes = promo.vigente_hasta
          ? Math.ceil(
              (new Date(promo.vigente_hasta).getTime() - Date.now()) /
                86_400_000
            )
          : null

        const producto = grupo.productoId
          ? productoById.get(grupo.productoId)
          : null
        const precioRef =
          producto?.precio ??
          (unidades > 0 ? piezas.reduce((a, b) => a + b, 0) / unidades : 0)

        rows.push({
          memberId: socioId,
          socioNombre: socio
            ? `${socio.nombre} ${socio.apellido ?? ""}`.trim()
            : "—",
          socioCodigo: socio?.codigo_socio ?? null,
          promocionId: promo.id,
          promocionNombre: promo.nombre,
          promocionCodigo: promo.codigo,
          vigenteHasta: promo.vigente_hasta,
          productoId: grupo.productoId,
          sku: producto?.sku ?? null,
          nombre: producto?.nombre ?? promo.nombre,
          presentacion: producto?.presentacion ?? null,
          imagenUrl: producto?.imagen_url ?? null,
          precio: precioRef,
          compraCantidad,
          pagaCantidad,
          piezasGratisPorCiclo: gratisPorCiclo,
          unidadesCompradas: unidades,
          unidadesDevueltas: devueltas,
          // Cronológico, como el "Proceso" que va justo encima: la lista
          // cuenta cómo se llegó hasta aquí («compró 2, luego 1 más, luego
          // devolvió 1»), y leerla al revés de los nodos del proceso obliga
          // a rehacer el orden en la cabeza.
          movimientos: movimientos.sort((a, b) =>
            a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
          ),
          gastoAcumulado: piezas.reduce((a, b) => a + b, 0),
          unidadesEnCiclo: enCiclo,
          // Con una pieza ganada sin reclamar, el ciclo está cumplido: no falta
          // nada. Sin ella, `enCiclo === 0` significa que el anterior ya se
          // cobró y este empieza de cero — faltan las `compraCantidad` enteras,
          // no cero. Devolver 0 ahí pintaba "Faltan 0" en un ciclo sin empezar.
          faltan: porReclamar > 0 ? 0 : compraCantidad - enCiclo,
          // Con un ciclo cumplido sin reclamar, el "Proceso" muestra ESE
          // ciclo —el que se ganó, con sus importes— y no el siguiente, que
          // todavía no empieza. Ver `accumulation-cycle.ts`: vive aparte y
          // con pruebas porque el off-by-one de aquí dejaba la tarjeta
          // diciendo "$0,00" al lado de un anillo que decía "LISTA".
          pagosEnCiclo: cyclePayments(piezas, {
            ciclos,
            enCiclo,
            compraCantidad,
            porReclamar,
          }),
          piezasGratis: ciclos * gratisPorCiclo,
          ahorro: ciclos * gratisPorCiclo * precioRef,
          estado: accumulationStatus({
            estadoPublicacion: promo.estado_publicacion,
            presupuestoAgotado:
              promo.presupuesto_asignado > 0 &&
              promo.presupuesto_consumido >= promo.presupuesto_asignado,
            piezasGratis: ciclos * gratisPorCiclo,
            porReclamar,
            diasRestantes,
          }),
          piezasPorReclamar: porReclamar,
          diasRestantes,
        })
      }
    }
  }

  // Primero lo accionable, y dentro de eso lo más cerca de premiar. Las tres
  // situaciones perdidas van al final: se muestran para poder explicarlas,
  // no para trabajar sobre ellas.
  const orden = ACCUMULATION_STATUSES.reduce<Record<string, number>>(
    (acc, estado, index) => ({ ...acc, [estado]: index }),
    {}
  )
  // El estado se filtra aquí y no en SQL porque se deriva de las compras,
  // no de una columna: no existe hasta que se calcula.
  const visibles = filters.estados?.length
    ? rows.filter((r) => filters.estados?.includes(r.estado))
    : rows

  return visibles.sort(
    (a, b) =>
      (orden[a.estado] ?? 99) - (orden[b.estado] ?? 99) || a.faltan - b.faltan
  )
}
