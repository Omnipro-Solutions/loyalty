import { formatShortDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import type {
  BenefitType,
  ChannelScope,
  ConditionCombinator,
  CostNature,
  Financiador,
  LimitExcessBehavior,
  LimitSubject,
  LimitUnit,
  LimitWindow,
  PromotionEventType,
  PromotionPublicationStatus,
  PromotionType,
  SettlementPeriod,
} from "@/types/domain"

import {
  mechanicKpis,
  type MechanicBreakdown,
  type MechanicMetric,
} from "./mechanic-kpis"
import {
  BENEFIT_TYPE_LABEL,
  FINANCIADOR_LABEL,
  PROMOTION_TYPE_LABEL,
} from "./labels"
import {
  toDateParam,
  type DateWindow,
  type PromotionDimension,
} from "./dashboard-filters"
import { promotionStatus } from "./status"

export type PromotionRow = Database["public"]["Tables"]["promociones"]["Row"]

export type Condition =
  | { campo: "categoria"; valor: string[] }
  | { campo: "producto"; valor: string[] }
  | { campo: "tienda"; valor: string }
  | { campo: "segmento"; valor: string }
  | { campo: "monto_carrito"; valor: number }
  | { campo: "cupon_codigo"; valor: string }
  | { campo: "socio_nivel"; valor: string[] }
  | { campo: "socio_provincia"; valor: string[] }
  | { campo: "socio_antiguedad"; valor: number }
  | { campo: "socio_edad"; valor: number }
  | { campo: "genero"; valor: string[] }
  | { campo: "estado_civil"; valor: string[] }
  | { campo: "tiene_hijos"; valor: boolean }
  | { campo: "tiene_mascotas"; valor: boolean }
  | { campo: "tienda_region"; valor: string[] }
  | { campo: "tienda_formato"; valor: string[] }
  | { campo: "tienda_grupo"; valor: string[] }
  | { campo: "producto_marca"; valor: string[] }
  | { campo: "producto_proveedor"; valor: string[] }
  | { campo: "producto_receta"; valor: boolean }

/**
 * Árbol de condiciones (jsonb de `promociones.condiciones`) — grupos Y/O
 * anidados sin límite, la raíz siempre es un grupo. Mismo criterio
 * estructural que `ConditionGroupValues`/`ConditionNodeValues` de
 * `../schemas` (grupo vs hoja se distingue por tener `condiciones`, sin
 * campo discriminante) — se redeclara en vez de importar porque este
 * archivo es server-only y `schemas.ts` es el lado de validación de
 * cliente, mismo patrón de duplicación que ya tenía `Condition` aquí.
 */
export type ConditionGroup = {
  combinador: ConditionCombinator
  condiciones: ConditionNode[]
}
export type ConditionNode = Condition | ConditionGroup

function isConditionGroup(node: ConditionNode): node is ConditionGroup {
  return "condiciones" in node
}

/** Recolecta todas las hojas del árbol sin importar la anidación — mismo criterio que `flattenConditionTree` de `../lib/condition-tree.ts` (cliente), redeclarado aquí server-only por la misma razón que `ConditionGroup` arriba. Usado para resolver, ej., qué IDs de producto quedaron guardados en una condición `producto` (ver `[id]/editar/page.tsx`). */
export function flattenConditionNodes(node: ConditionNode): Condition[] {
  if (!isConditionGroup(node)) return [node]
  return node.condiciones.flatMap(flattenConditionNodes)
}

/** Elemento de `promociones.escalones` — solo con `tipo_beneficio = 'descuento_escalonado'` (docs §7.1a). */
export type Escalon = { umbral: number; beneficio_valor: number }

/** Elemento de `promociones.limites` — mismo tipo que `LimitValues` de `../schemas`, redeclarado (server-only, ver comentario de `ConditionGroup` arriba). */
export type Limit = {
  unidad: LimitUnit
  sujeto: LimitSubject
  ventana: LimitWindow
  ventanaDias?: number
  tope: number
  alExceder: LimitExcessBehavior
}

export type Promotion = Omit<
  PromotionRow,
  "condiciones" | "escalones" | "limites"
> & {
  condiciones: ConditionGroup
  escalones: Escalon[] | null
  limites: Limit[]
}

const EMPTY_CONDITION_GROUP: ConditionGroup = {
  combinador: "todas",
  condiciones: [],
}

function withTypedConditions(row: PromotionRow): Promotion {
  return {
    ...row,
    condiciones: (row.condiciones as ConditionGroup) ?? EMPTY_CONDITION_GROUP,
    // `null` (no `[]`) se conserva a propósito: distingue "esta promoción
    // no es escalonada" de "es escalonada pero sin escalones todavía".
    escalones: (row.escalones as Escalon[] | null) ?? null,
    limites: (row.limites as Limit[]) ?? [],
  }
}

/**
 * SKU → id de todo el catálogo activo, para resolver las columnas de
 * producto del CSV de importación. Trae solo las dos columnas que hacen
 * falta (no `listProductOptionsForPromotions`, que carga precio y marca
 * para pintar el picker) y sin tope bajo: un CSV puede referenciar
 * cualquier SKU, no solo los primeros por nombre.
 */
export async function listProductRefsForImport(): Promise<
  { id: string; sku: string }[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("productos")
    .select("id, sku")
    .eq("estado", "activo")
    .limit(5000)
  if (error) throw error
  return data ?? []
}

export type PromotionsFilters = {
  search?: string
  publicationStatus?: PromotionPublicationStatus
  channel?: string
  page?: number
  pageSize?: number
}

export const PROMOTIONS_PAGE_SIZE = 10

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export async function listPromotions(
  filters: PromotionsFilters = {}
): Promise<{ promotions: Promotion[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? PROMOTIONS_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

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

export type PromotionCoverage = {
  /** Mecánicas que entran en el cálculo: activas + programadas. */
  promotions: number
  /** Categorías distintas alcanzadas — todas si alguna mecánica no acota producto. */
  categories: number
  totalCategories: number
  /** SKUs nombrados explícitamente en una condición de producto. */
  products: number
  segments: number
  cities: number
  channels: number
  /** Mecánicas sin condición de categoría ni de producto: alcanzan el catálogo entero. */
  catalogWide: number
}

export type PromotionFundingSlice = {
  financiador: Financiador
  amount: number
  /** Parte del presupuesto total, 0-1. */
  share: number
}

/** Cuántas mecánicas de cada tipo se crearon en la ventana de tendencia. */
export type PromotionMechanicSlice = {
  benefitType: BenefitType
  count: number
  share: number
}

/** Un pendiente del área: algo que hay que decidir o completar, con su conteo. */
export type PromotionAttentionItem = {
  id:
    | "borradores"
    | "por_vencer"
    | "vencidas_sin_cerrar"
    | "sin_grupo_exclusion"
    | "sin_aprobacion_rx"
  count: number
  /** Dato que da urgencia al pendiente ("el más antiguo lleva 12 días"). */
  detail?: string
  /** Filtro del listado que aísla estas filas, si existe uno. */
  href?: string
  tone: "warning" | "destructive" | "neutral"
}

export type PromotionsPlanningKpis = {
  coverage: PromotionCoverage
  activity: {
    active: number
    scheduled: number
    drafts: number
    inactive: number
    finished: number
  }
  funding: { total: number; slices: PromotionFundingSlice[] }
  /** Últimos 6 meses de creación, del más antiguo al más reciente. */
  /** Cómo se reparten las mecánicas creadas, de mayor a menor. */
  mechanics: {
    total: number
    slices: PromotionMechanicSlice[]
    /** La más creada — `null` si todavía no hay ninguna. */
    dominant: PromotionMechanicSlice | null
  }
  attention: PromotionAttentionItem[]
}

/** Orden de urgencia de los pendientes — el mismo criterio en Promociones y Cupones. */
const ATTENTION_TONE_ORDER = { destructive: 0, warning: 1, neutral: 2 }

/** Ventana de "por vencer" — un mes es el plazo en el que todavía da tiempo a renovar o dejar caer. */
const EXPIRING_SOON_DAYS = 30

/**
 * Los 3 KPI de 06.1 — alcance, actividad y financiación.
 *
 * Esta vista es de CREACIÓN Y GESTIÓN: las mecánicas pueden no haber
 * corrido todavía, así que aquí no hay canjes, ROI ni presupuesto
 * consumido. Todo sale de lo que el operador declaró al configurarlas
 * (condiciones, vigencia, financiador, presupuesto asignado); los
 * resultados reales viven en "Panel de promociones".
 */
export async function getPromotionsPlanningKpis(): Promise<PromotionsPlanningKpis> {
  const supabase = await createClient()
  const [{ data, error }, categories] = await Promise.all([
    supabase
      .from("promociones")
      .select(
        "estado_publicacion, vigente_desde, vigente_hasta, condiciones, canal_aplicacion, financiador, presupuesto_asignado, creado_en, aplica_a_rx, aprobacion_regulatoria, tipo_beneficio, acumulable, grupo_exclusion"
      ),
    listConditionCategories(),
  ])
  if (error) throw error

  const rows = data ?? []
  const categoryIds = new Set<string>()
  const productIds = new Set<string>()
  const segmentIds = new Set<string>()
  const cities = new Set<string>()
  const channels = new Set<string>()
  const budgetByFinanciador = new Map<Financiador, number>()

  const now = new Date()
  const expiringLimit = new Date(now)
  expiringLimit.setDate(expiringLimit.getDate() + EXPIRING_SOON_DAYS)

  const mechanicCounts = new Map<BenefitType, number>()
  let expiringSoon = 0
  let expiredStillActive = 0
  let nonStackableWithoutGroup = 0
  let rxWithoutApproval = 0
  let oldestDraftDays = 0

  let active = 0
  let scheduled = 0
  let drafts = 0
  let inactive = 0
  let finished = 0
  let inScope = 0
  let catalogWide = 0
  let totalBudget = 0

  for (const row of rows) {
    const status = promotionStatus(row)
    if (status === "activa") active += 1
    else if (status === "programada") scheduled += 1
    else if (status === "inactiva") inactive += 1
    else if (status === "finalizada") finished += 1
    else if (status === "borrador") {
      drafts += 1
      const age = Math.floor(
        (now.getTime() - new Date(row.creado_en).getTime()) / 86_400_000
      )
      oldestDraftDays = Math.max(oldestDraftDays, age)
    }

    // El ritmo se mide sobre TODAS las mecánicas creadas, publicadas o no:
    // un borrador también es trabajo del área.
    // La mezcla se mide sobre TODAS las mecánicas creadas, publicadas o
    // no: un borrador también dice qué está construyendo el área.
    const benefitType = row.tipo_beneficio as BenefitType
    mechanicCounts.set(benefitType, (mechanicCounts.get(benefitType) ?? 0) + 1)

    // Vencida pero todavía marcada como activa: `promotionStatus` ya la
    // muestra como finalizada, pero su `estado_publicacion` sigue en
    // 'activa' — hay que decidir si se renueva o se cierra.
    if (row.estado_publicacion === "activa" && status === "finalizada") {
      expiredStillActive += 1
    }

    // S04 · una mecánica no acumulable sin grupo de exclusión no le dice al
    // motor a cuáles bloquea.
    if (
      (status === "activa" || status === "programada") &&
      !row.acumulable &&
      !row.grupo_exclusion
    ) {
      nonStackableWithoutGroup += 1
    }

    // S12 · una mecánica que toca productos con receta sin aprobación
    // regulatoria no debería estar corriendo.
    if (
      (status === "activa" || status === "programada") &&
      row.aplica_a_rx !== "permitido" &&
      !row.aprobacion_regulatoria
    ) {
      rxWithoutApproval += 1
    }
    if (status === "activa" && row.vigente_hasta) {
      const validTo = new Date(row.vigente_hasta)
      if (validTo >= now && validTo <= expiringLimit) expiringSoon += 1
    }

    // La financiación se mide sobre lo que ya está comprometido: una
    // mecánica finalizada o inactiva ya no compromete presupuesto.
    if (status === "activa" || status === "programada") {
      const financiador = row.financiador as Financiador
      const budget = row.presupuesto_asignado ?? 0
      totalBudget += budget
      budgetByFinanciador.set(
        financiador,
        (budgetByFinanciador.get(financiador) ?? 0) + budget
      )
    } else {
      continue
    }

    inScope += 1
    channels.add(row.canal_aplicacion)

    const leaves = flattenConditionNodes(row.condiciones as ConditionNode)
    let hasProductScope = false
    for (const leaf of leaves) {
      if (leaf.campo === "categoria") {
        hasProductScope = true
        for (const id of leaf.valor) categoryIds.add(id)
      } else if (leaf.campo === "producto") {
        hasProductScope = true
        for (const id of leaf.valor) productIds.add(id)
      } else if (leaf.campo === "segmento") {
        segmentIds.add(leaf.valor)
      } else if (leaf.campo === "tienda") {
        cities.add(leaf.valor)
      }
    }
    if (!hasProductScope) catalogWide += 1
  }

  const slices = [...budgetByFinanciador.entries()]
    .map(([financiador, amount]) => ({
      financiador,
      amount,
      share: totalBudget > 0 ? amount / totalBudget : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const totalMechanics = rows.length
  const mechanicSlices = [...mechanicCounts.entries()]
    .map(([benefitType, count]) => ({
      benefitType,
      count,
      share: totalMechanics > 0 ? count / totalMechanics : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Solo los pendientes que existen: una lista con ceros es ruido, y el
  // caso "nada pendiente" se dibuja aparte.
  const attention: PromotionAttentionItem[] = [
    {
      id: "borradores" as const,
      count: drafts,
      detail:
        oldestDraftDays > 0
          ? `${oldestDraftDays} ${oldestDraftDays === 1 ? "día" : "días"} el más viejo`
          : undefined,
      href: "/promociones?estado=borrador",
      tone: "warning" as const,
    },
    {
      id: "por_vencer" as const,
      count: expiringSoon,
      detail: `próximos ${EXPIRING_SOON_DAYS} días`,
      tone: "warning" as const,
    },
    {
      id: "vencidas_sin_cerrar" as const,
      count: expiredStillActive,
      detail: "aún marcadas activas",
      tone: "warning" as const,
    },
    {
      id: "sin_grupo_exclusion" as const,
      count: nonStackableWithoutGroup,
      detail: "regla S04",
      tone: "neutral" as const,
    },
    {
      id: "sin_aprobacion_rx" as const,
      count: rxWithoutApproval,
      detail: "tocan productos con receta (S12)",
      tone: "destructive" as const,
    },
  ]
    .filter((item) => item.count > 0)
    // Lo urgente primero: dentro de cada tono, lo más numeroso arriba —
    // mismo criterio que en Cupones.
    .sort(
      (a, b) =>
        ATTENTION_TONE_ORDER[a.tone] - ATTENTION_TONE_ORDER[b.tone] ||
        b.count - a.count
    )

  return {
    coverage: {
      promotions: inScope,
      // Una sola mecánica sin acotar producto ya alcanza todo el catálogo:
      // contar solo las categorías nombradas subestimaría la cobertura.
      categories: catalogWide > 0 ? categories.length : categoryIds.size,
      totalCategories: categories.length,
      products: productIds.size,
      segments: segmentIds.size,
      cities: cities.size,
      channels: channels.size,
      catalogWide,
    },
    activity: { active, scheduled, drafts, inactive, finished },
    funding: { total: totalBudget, slices },
    mechanics: {
      total: totalMechanics,
      slices: mechanicSlices,
      dominant: mechanicSlices[0] ?? null,
    },
    attention,
  }
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
    // `estado_publicacion = 'activa'` no basta (todavía hay que descartar
    // por fecha en JS, ver el `.filter` de abajo) así que no se puede
    // recortar a `limit` directo en SQL — este techo es solo defensivo
    // (evita traer TODAS las activas de la org si algún día son miles).
    .limit(50)
  if (error) throw error
  return (data ?? [])
    .map(withTypedConditions)
    .filter((p) => promotionStatus(p) === "activa")
    .slice(0, limit)
}

export type PromotionsDashboardFilters = {
  window?: DateWindow
  tipos?: PromotionType[]
  canales?: ChannelScope[]
  financiadores?: Financiador[]
  promocionIds?: string[]
  /** Mecánica (`tipo_beneficio`) — el eje que la vista de resultados usa para decidir qué widgets tienen sentido. */
  mecanicas?: BenefitType[]
}

/**
 * Filtros de "Panel de promociones" compartidos por todas sus consultas —
 * una sola fuente de verdad para que nunca se desincronicen entre widgets.
 * La vigencia filtra por solape con la ventana (`vigente_desde < hasta` y
 * `vigente_hasta` nulo o `>= desde`), no por fecha de creación: no hay
 * evento con fecha real detrás, solo la vigencia de la fila (ver
 * `dashboard-filters.ts`).
 */
export function applyDashboardFilters<
  T extends {
    in(column: string, values: readonly string[]): T
    lt(column: string, value: string): T
    or(filters: string): T
  },
>(query: T, filters: PromotionsDashboardFilters): T {
  let q = query
  if (filters.tipos && filters.tipos.length > 0) {
    q = q.in("tipo", filters.tipos)
  }
  if (filters.mecanicas && filters.mecanicas.length > 0) {
    q = q.in("tipo_beneficio", filters.mecanicas)
  }
  if (filters.canales && filters.canales.length > 0) {
    q = q.in("canal_aplicacion", filters.canales)
  }
  if (filters.financiadores && filters.financiadores.length > 0) {
    q = q.in("financiador", filters.financiadores)
  }
  if (filters.promocionIds && filters.promocionIds.length > 0) {
    q = q.in("id", filters.promocionIds)
  }
  if (filters.window) {
    q = q.lt("vigente_desde", toDateParam(filters.window.to))
    q = q.or(
      `vigente_hasta.is.null,vigente_hasta.gte.${toDateParam(filters.window.from)}`
    )
  }
  return q
}

export type TopPromotionByRedemptions = {
  id: string
  nombre: string
  canjes: number
}

/** Top N por `canjes` real (columna de fila, ver comentario de `getPromotionsDashboardKpis`) — excluye promociones sin canjes para no diluir el ranking. */
export async function getTopPromotionsByRedemptions(
  limit = 5,
  filters: PromotionsDashboardFilters = {}
): Promise<TopPromotionByRedemptions[]> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase.from("promociones").select("id, nombre, canjes"),
    filters
  )
    .gt("canjes", 0)
    .order("canjes", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export type BudgetByFinancier = {
  financiador: Financiador
  amount: number
  /** 0-100, no una fracción — mismo criterio que `RealChannelAttribution.pct` de `features/dashboard/lib/queries.ts`. */
  pct: number
  colorVar: string
}

/** Mismas 4 series de `--data-*` que `ChannelAttributionWidget`, en el orden en que aparecen (mayor a menor presupuesto). */
const FINANCIER_COLOR_VARS = [
  "--data-indigo",
  "--data-teal",
  "--data-amber",
  "--data-violet",
]

/** Suma de `presupuesto_asignado` agrupada por `financiador` (retailer/laboratorio/compartido/marca propia) — quién financia el presupuesto, no un dato fabricado. */
export async function getBudgetByFinancier(
  filters: PromotionsDashboardFilters = {}
): Promise<BudgetByFinancier[]> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase.from("promociones").select("financiador, presupuesto_asignado"),
    filters
  )
  if (error) throw error

  const totals = new Map<Financiador, number>()
  for (const row of data ?? []) {
    const financiador = row.financiador as Financiador
    totals.set(
      financiador,
      (totals.get(financiador) ?? 0) + row.presupuesto_asignado
    )
  }
  const total = [...totals.values()].reduce((acc, v) => acc + v, 0)
  return [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([financiador, amount], index) => ({
      financiador,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      colorVar: FINANCIER_COLOR_VARS[index % FINANCIER_COLOR_VARS.length],
    }))
}

export type PromotionRoiRankingItem = {
  id: string
  nombre: string
  tipo: PromotionType
  canalAplicacion: ChannelScope
  canjes: number
  presupuestoConsumido: number
  roi: number
}

/**
 * Extremos de `roi` (columna real, contador manual — ver comentario de
 * `getPromotionsDashboardKpis`): las de mayor y menor retorno, excluyendo
 * las que todavía no tienen `roi` capturado.
 */
export async function getPromotionsRoiRanking(
  filters: PromotionsDashboardFilters = {}
): Promise<{
  top: PromotionRoiRankingItem[]
  bottom: PromotionRoiRankingItem[]
}> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase
      .from("promociones")
      .select(
        "id, nombre, tipo, canal_aplicacion, canjes, presupuesto_consumido, roi"
      ),
    filters
  )
    .not("roi", "is", null)
    .order("roi", { ascending: false })
  if (error) throw error

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo as PromotionType,
    canalAplicacion: row.canal_aplicacion as ChannelScope,
    canjes: row.canjes,
    presupuestoConsumido: row.presupuesto_consumido,
    roi: row.roi as number,
  }))

  const top = rows.slice(0, 4)
  const rest = rows.slice(top.length)
  const bottom = rest.slice(Math.max(0, rest.length - 3))
  return { top, bottom }
}

export type PromotionEventItem = {
  id: string
  promocionId: string
  promocionNombre: string
  tipo: PromotionEventType
  titulo: string
  detalle: string | null
  actorEtiqueta: string
  canal: ChannelScope | null
  codigoMotivo: string | null
  notaMotivo: string | null
  metadatos: Record<string, unknown>
  ocurridoEn: string
}

/**
 * Bitácora de UNA promoción, para el "Historial" de su vista de detalle.
 * Más antiguos primero: es una línea de tiempo que se lee hacia abajo, al
 * revés que la tabla de Logs del panel (que prioriza lo reciente).
 *
 * Si no hay evento `creada` (las promociones sembradas o importadas antes
 * de que existiera la bitácora no lo tienen), se sintetiza uno desde
 * `promociones.creado_en` — la fecha es real; el autor no se conoce, y se
 * dice en vez de inventarlo.
 */
/** Eventos que son actividad del motor sobre la regla, no acciones de gestión sobre ella. */
const PROMOTION_TRANSACTION_EVENTS = ["canje", "canje_rechazado"] as const

export async function listPromotionHistory(
  promocionId: string
): Promise<PromotionEventItem[]> {
  const supabase = await createClient()
  const [{ data, error }, { data: promotion, error: promotionError }] =
    await Promise.all([
      supabase
        .from("promocion_eventos")
        .select(
          "id, promocion_id, tipo, titulo, detalle, actor_etiqueta, canal, codigo_motivo, nota_motivo, metadatos, ocurrido_en"
        )
        .eq("promocion_id", promocionId)
        // El Historial es la bitácora de GESTIÓN de la promoción: qué se
        // hizo con ella y quién. Los canjes son actividad agregada de la
        // regla, no acciones sobre ella — y además hoy son datos de demo
        // (no hay motor de canje, ver `20260826160000_promociones_eventos.sql`),
        // así que una promoción creada hoy aparecía con "transacciones" de
        // ayer. Esa actividad vive en "Panel de promociones".
        .not("tipo", "in", `(${PROMOTION_TRANSACTION_EVENTS.join(",")})`)
        .order("ocurrido_en", { ascending: true }),
      supabase
        .from("promociones")
        .select("nombre, creado_en")
        .eq("id", promocionId)
        .maybeSingle(),
    ])
  if (error) throw error
  if (promotionError) throw promotionError

  const name = promotion?.nombre ?? "—"
  const events: PromotionEventItem[] = (data ?? []).map((row) => ({
    id: row.id,
    promocionId: row.promocion_id,
    promocionNombre: name,
    tipo: row.tipo as PromotionEventType,
    titulo: row.titulo,
    detalle: row.detalle,
    actorEtiqueta: row.actor_etiqueta,
    canal: row.canal as ChannelScope | null,
    codigoMotivo: row.codigo_motivo,
    notaMotivo: row.nota_motivo,
    metadatos: (row.metadatos as Record<string, unknown>) ?? {},
    ocurridoEn: row.ocurrido_en,
  }))

  if (promotion && !events.some((event) => event.tipo === "creada")) {
    events.unshift({
      id: `sintetico-creada-${promocionId}`,
      promocionId,
      promocionNombre: name,
      tipo: "creada",
      titulo: "Creada",
      detalle: "Anterior a la bitácora — no se registró quién la creó.",
      actorEtiqueta: "No registrado",
      canal: null,
      codigoMotivo: null,
      notaMotivo: null,
      metadatos: {},
      ocurridoEn: promotion.creado_en,
    })
  }

  return events
}

export type PromotionCanjesTrendRow = {
  weekKey: string
  weekLabel: string
  counts: Partial<Record<PromotionType, number>>
}

/**
 * "Canjes por semana" real, agrupado por `promociones.tipo` — a diferencia
 * de `canjes`/`presupuesto_consumido` (contadores de fila), esto sí tiene
 * fecha real detrás (`promocion_eventos.ocurrido_en`). Volumen de la
 * muestra sembrada, no de producción — ver comentario de
 * `20260826190000_promociones_eventos_demo_extra.sql`.
 */
export async function getPromotionCanjesTrend(
  promocionIds?: string[]
): Promise<{
  rows: PromotionCanjesTrendRow[]
  tipos: PromotionType[]
}> {
  const supabase = await createClient()
  let query = supabase
    .from("promocion_eventos")
    .select("ocurrido_en, promocion_id")
    .eq("tipo", "canje")
  if (promocionIds && promocionIds.length > 0) {
    query = query.in("promocion_id", promocionIds)
  }
  const { data, error } = await query
  if (error) throw error

  const eventPromocionIds = [
    ...new Set((data ?? []).map((row) => row.promocion_id)),
  ]
  const tipoById = new Map<string, PromotionType>()
  if (eventPromocionIds.length > 0) {
    const { data: promos, error: promosError } = await supabase
      .from("promociones")
      .select("id, tipo")
      .in("id", eventPromocionIds)
    if (promosError) throw promosError
    for (const promo of promos ?? [])
      tipoById.set(promo.id, promo.tipo as PromotionType)
  }

  const buckets = new Map<string, Partial<Record<PromotionType, number>>>()
  const mondayByWeekKey = new Map<string, Date>()
  for (const row of data ?? []) {
    const tipo = tipoById.get(row.promocion_id)
    if (!tipo) continue
    const occurred = new Date(row.ocurrido_en)
    const monday = new Date(occurred)
    const day = monday.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    monday.setDate(monday.getDate() - diffToMonday)
    monday.setHours(0, 0, 0, 0)
    const weekKey = toDateParam(monday)
    mondayByWeekKey.set(weekKey, monday)

    const bucket = buckets.get(weekKey) ?? {}
    bucket[tipo] = (bucket[tipo] ?? 0) + 1
    buckets.set(weekKey, bucket)
  }

  const weekKeys = [...buckets.keys()].sort()
  const rows = weekKeys.map((weekKey) => ({
    weekKey,
    weekLabel: formatShortDate(mondayByWeekKey.get(weekKey)!),
    counts: buckets.get(weekKey)!,
  }))
  const tipos = [...new Set(tipoById.values())]
  return { rows, tipos }
}

export type PromotionChannelAttributionItem = {
  canal: ChannelScope
  count: number
  pct: number
}

/**
 * Atribución real de `canje`/`canje_rechazado` por `canal` del evento (no
 * `promociones.canal_aplicacion`, que es config de la promoción). Excluye
 * eventos sin `canal` (los de ciclo de vida no lo tienen).
 */
export async function getPromotionChannelAttribution(
  promocionIds?: string[]
): Promise<PromotionChannelAttributionItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from("promocion_eventos")
    .select("canal")
    .in("tipo", ["canje", "canje_rechazado"])
    .not("canal", "is", null)
  if (promocionIds && promocionIds.length > 0) {
    query = query.in("promocion_id", promocionIds)
  }
  const { data, error } = await query
  if (error) throw error

  const totals = new Map<ChannelScope, number>()
  for (const row of data ?? []) {
    const canal = row.canal as ChannelScope
    totals.set(canal, (totals.get(canal) ?? 0) + 1)
  }
  const total = [...totals.values()].reduce((acc, v) => acc + v, 0)
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([canal, count]) => ({
      canal,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
}

export type PromotionOption = { id: string; name: string }

/** Opciones para el filtro "Promoción" de "Panel de promociones" — todas, sin importar estado/vigencia (el usuario puede querer aislar una que ya venció o una en borrador). */
export async function listPromotionOptions(): Promise<PromotionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, name: row.nombre }))
}

export type AverageCartByPromotion = {
  id: string
  nombre: string
  avgCartValue: number
  sampleSize: number
}

/** Ticket promedio real de los canjes con `monto_carrito` en `metadatos` (envío gratis, cashback, descuentos de carrito) — no todas las mecánicas lo registran, así que solo entran las que sí lo hacen. */
export async function getAverageCartByPromotion(
  filters: PromotionsDashboardFilters = {}
): Promise<AverageCartByPromotion[]> {
  const supabase = await createClient()
  const { data: promos, error } = await applyDashboardFilters(
    supabase.from("promociones").select("id, nombre"),
    filters
  )
  if (error) throw error
  const promoIds = (promos ?? []).map((p) => p.id)
  if (promoIds.length === 0) return []
  const nameById = new Map((promos ?? []).map((p) => [p.id, p.nombre]))

  const { data: events, error: eventsError } = await supabase
    .from("promocion_eventos")
    .select("promocion_id, metadatos")
    .eq("tipo", "canje")
    .in("promocion_id", promoIds)
  if (eventsError) throw eventsError

  const sums = new Map<string, { total: number; count: number }>()
  for (const row of events ?? []) {
    const metadatos = row.metadatos as Record<string, unknown>
    const montoCarrito = metadatos.monto_carrito
    if (typeof montoCarrito !== "number") continue
    const acc = sums.get(row.promocion_id) ?? { total: 0, count: 0 }
    acc.total += montoCarrito
    acc.count += 1
    sums.set(row.promocion_id, acc)
  }

  return [...sums.entries()]
    .map(([id, { total, count }]) => ({
      id,
      nombre: nameById.get(id) ?? "—",
      avgCartValue: total / count,
      sampleSize: count,
    }))
    .sort((a, b) => b.avgCartValue - a.avgCartValue)
}

export type BudgetByCostNature = {
  naturaleza: CostNature
  amount: number
  /** 0-100, no una fracción — mismo criterio que `BudgetByFinancier.pct`. */
  pct: number
  colorVar: string
}

/** Mismas series de `--data-*` que `PromotionsBudgetByFinancier`, en orden de mayor a menor presupuesto. */
const COST_NATURE_COLOR_VARS = [
  "--data-indigo",
  "--data-teal",
  "--data-amber",
  "--data-violet",
  "--data-coral",
  "--data-navy",
]

/** Suma de `presupuesto_asignado` agrupada por `naturaleza_costo` — a qué cuenta contable golpea el presupuesto, real (mismo criterio que `getBudgetByFinancier`). */
export async function getBudgetByCostNature(
  filters: PromotionsDashboardFilters = {}
): Promise<BudgetByCostNature[]> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase
      .from("promociones")
      .select("naturaleza_costo, presupuesto_asignado"),
    filters
  )
  if (error) throw error

  const totals = new Map<CostNature, number>()
  for (const row of data ?? []) {
    const naturaleza = row.naturaleza_costo as CostNature
    totals.set(
      naturaleza,
      (totals.get(naturaleza) ?? 0) + row.presupuesto_asignado
    )
  }
  const total = [...totals.values()].reduce((acc, v) => acc + v, 0)
  return [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([naturaleza, amount], index) => ({
      naturaleza,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      colorVar: COST_NATURE_COLOR_VARS[index % COST_NATURE_COLOR_VARS.length],
    }))
}

/** Día calendario en UTC como entero comparable — mismo criterio que `dateOnly` de `./status.ts` (evita que la hora del día o el huso corran el límite). */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const targetUTC = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate()
  )
  const now = new Date()
  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )
  return Math.round((targetUTC - todayUTC) / 86_400_000)
}

export type BudgetPaceItem = {
  id: string
  nombre: string
  /** Fracción 0-1, no porcentaje — mismo criterio que `PromotionsDashboardKpis.consumedBudgetPct`. */
  consumedPct: number
  diasRestantesPresupuesto: number
  diasRestantesVigencia: number | null
  seAgotaAntesDeVigencia: boolean
}

/**
 * Ritmo de consumo proyectado: gasto diario observado desde `vigente_desde`
 * (`presupuesto_consumido` / días transcurridos) extrapolado contra lo que
 * queda de presupuesto — a diferencia de "En alerta" (que solo mira el %
 * consumido hoy contra un umbral fijo), esto avisa cuándo el presupuesto se
 * agotará antes de que termine la vigencia. Solo promociones realmente
 * activas hoy con consumo real (sin eso no hay ritmo que proyectar).
 */
export async function getPromotionsBudgetPace(
  filters: PromotionsDashboardFilters = {}
): Promise<BudgetPaceItem[]> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase
      .from("promociones")
      .select(
        "id, nombre, estado_publicacion, vigente_desde, vigente_hasta, presupuesto_asignado, presupuesto_consumido"
      ),
    filters
  )
  if (error) throw error

  const items: BudgetPaceItem[] = []
  for (const row of data ?? []) {
    if (promotionStatus(row) !== "activa") continue
    if (row.presupuesto_consumido <= 0 || row.presupuesto_asignado <= 0)
      continue

    const daysSinceStart = Math.max(1, -daysUntil(row.vigente_desde))
    const dailyRate = row.presupuesto_consumido / daysSinceStart
    const remainingBudget = row.presupuesto_asignado - row.presupuesto_consumido
    const diasRestantesPresupuesto = Math.max(
      0,
      Math.floor(remainingBudget / dailyRate)
    )
    const diasRestantesVigencia = row.vigente_hasta
      ? Math.max(0, daysUntil(row.vigente_hasta))
      : null

    items.push({
      id: row.id,
      nombre: row.nombre,
      consumedPct: row.presupuesto_consumido / row.presupuesto_asignado,
      diasRestantesPresupuesto,
      diasRestantesVigencia,
      seAgotaAntesDeVigencia:
        diasRestantesVigencia !== null &&
        diasRestantesPresupuesto < diasRestantesVigencia,
    })
  }

  return items.sort(
    (a, b) => a.diasRestantesPresupuesto - b.diasRestantesPresupuesto
  )
}

export type GiftedUnitsByProduct = {
  productId: string
  productName: string
  unidades: number
}

/** Unidades regaladas reales por producto (`metadatos.producto_id`/`cantidad` de canjes `producto_gratis`/`por_piezas`) — no todas las mecánicas lo registran, solo entran las que sí. */
export async function getGiftedUnitsByProduct(
  filters: PromotionsDashboardFilters = {}
): Promise<GiftedUnitsByProduct[]> {
  const supabase = await createClient()
  const { data: promos, error } = await applyDashboardFilters(
    supabase.from("promociones").select("id"),
    filters
  )
  if (error) throw error
  const promoIds = (promos ?? []).map((p) => p.id)
  if (promoIds.length === 0) return []

  const { data: events, error: eventsError } = await supabase
    .from("promocion_eventos")
    .select("metadatos")
    .eq("tipo", "canje")
    .in("promocion_id", promoIds)
  if (eventsError) throw eventsError

  const totals = new Map<string, number>()
  for (const row of events ?? []) {
    const metadatos = row.metadatos as Record<string, unknown>
    const productoId = metadatos.producto_id
    const cantidad = metadatos.cantidad
    if (typeof productoId !== "string" || typeof cantidad !== "number") continue
    totals.set(productoId, (totals.get(productoId) ?? 0) + cantidad)
  }
  if (totals.size === 0) return []

  const { data: productos, error: productosError } = await supabase
    .from("productos")
    .select("id, nombre")
    .in("id", [...totals.keys()])
  if (productosError) throw productosError
  const nameById = new Map((productos ?? []).map((p) => [p.id, p.nombre]))

  return [...totals.entries()]
    .map(([productId, unidades]) => ({
      productId,
      productName: nameById.get(productId) ?? "—",
      unidades,
    }))
    .sort((a, b) => b.unidades - a.unidades)
}

export type PointsAwardedByPromotion = {
  id: string
  nombre: string
  totalPoints: number
  sampleSize: number
}

/** Puntos otorgados reales (`metadatos.puntos_otorgados` de canjes `multiplicador_puntos`/`bono_puntos`) — no todas las mecánicas lo registran, solo entran las que sí. */
export async function getPointsAwardedByPromotion(
  filters: PromotionsDashboardFilters = {}
): Promise<PointsAwardedByPromotion[]> {
  const supabase = await createClient()
  const { data: promos, error } = await applyDashboardFilters(
    supabase.from("promociones").select("id, nombre"),
    filters
  )
  if (error) throw error
  const promoIds = (promos ?? []).map((p) => p.id)
  if (promoIds.length === 0) return []
  const nameById = new Map((promos ?? []).map((p) => [p.id, p.nombre]))

  const { data: events, error: eventsError } = await supabase
    .from("promocion_eventos")
    .select("promocion_id, metadatos")
    .eq("tipo", "canje")
    .in("promocion_id", promoIds)
  if (eventsError) throw eventsError

  const totals = new Map<string, { points: number; count: number }>()
  for (const row of events ?? []) {
    const metadatos = row.metadatos as Record<string, unknown>
    const puntos = metadatos.puntos_otorgados
    if (typeof puntos !== "number") continue
    const acc = totals.get(row.promocion_id) ?? { points: 0, count: 0 }
    acc.points += puntos
    acc.count += 1
    totals.set(row.promocion_id, acc)
  }

  return [...totals.entries()]
    .map(([id, { points, count }]) => ({
      id,
      nombre: nameById.get(id) ?? "—",
      totalPoints: points,
      sampleSize: count,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
}

export type ConditionCategory = { id: string; name: string }

/**
 * Categorías raíz reales de Catálogo, para el selector de la condición
 * "Categoría del producto" — filtrado a `taxonomia = 'comercial'` (S11,
 * S23): la terapéutica es dato de salud bajo la LFPDPPP y solo puede
 * restringir dónde aplica una promoción, nunca construir la audiencia.
 */
export async function listConditionCategories(): Promise<ConditionCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre")
    .is("parent_id", null)
    .eq("taxonomia", "comercial")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((c) => ({ id: c.id, name: c.nombre }))
}

export type ConditionCity = { city: string; totalStores: number }

/** Ciudades reales de Tiendas con conteo, para el selector de la condición "Tienda" (07.1: "Barranquilla (14)"). Agregado en DB (`condition_cities`) — antes traía `tiendas` completa para contar en JS. */
export async function listConditionCities(): Promise<ConditionCity[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("condition_cities")
  if (error) throw error
  return (data ?? []).map((row) => ({
    city: row.ciudad,
    totalStores: row.total_stores,
  }))
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

/** Opción genérica {value, label} para los selectores de condición cuyo universo de valores es "los distintos que existan hoy en una columna de texto" (provincia, región, marca, proveedor) — sin tabla de catálogo propia detrás. */
export type ConditionOption = { value: string; label: string }

export type ConditionTier = { id: string; name: string }

/** Niveles reales de lealtad (`tiers`), para la condición "Nivel de lealtad" — ordenados por `orden`, no alfabéticamente, para que el multiselect respete la jerarquía del programa. */
export async function listConditionTiers(): Promise<ConditionTier[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiers")
    .select("id, nombre")
    .order("orden")
  if (error) throw error
  return (data ?? []).map((t) => ({ id: t.id, name: t.nombre }))
}

/** Provincias reales con al menos un socio, para la condición "Provincia del socio". Distinct en DB (`condition_provinces`). */
export async function listConditionProvinces(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("condition_provinces")
  if (error) throw error
  return (data ?? []).map((row) => ({
    value: row.provincia,
    label: row.provincia,
  }))
}

/** Regiones reales de Tiendas, para la condición "Región de la tienda". Distinct en DB (`condition_store_regions`). */
export async function listConditionStoreRegions(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("condition_store_regions")
  if (error) throw error
  return (data ?? []).map((row) => ({ value: row.region, label: row.region }))
}

export type ConditionStoreGroup = { id: string; name: string }

/** Grupos de tienda reales (`tienda_grupos`), para la condición "Grupo de tienda" — duplica `features/stores/lib/queries.ts` `listStoreGroups` (aislamiento entre features, CLAUDE.md §2), sin el conteo de tiendas que ese sí necesita. */
export async function listConditionStoreGroups(): Promise<
  ConditionStoreGroup[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tienda_grupos")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((g) => ({ id: g.id, name: g.nombre }))
}

/** Marcas reales de Catálogo, para la condición "Marca del producto". Distinct en DB (`condition_brands`). */
export async function listConditionBrands(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("condition_brands")
  if (error) throw error
  return (data ?? []).map((row) => ({ value: row.marca, label: row.marca }))
}

/** Proveedores/laboratorios reales de Catálogo, para la condición "Proveedor / laboratorio". Distinct en DB (`condition_suppliers`). */
export async function listConditionSuppliers(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("condition_suppliers")
  if (error) throw error
  return (data ?? []).map((row) => ({
    value: row.proveedor,
    label: row.proveedor,
  }))
}

export type SupplierOption = { id: string; name: string }

/**
 * Catálogo `proveedores` (nombre + RFC), para el select "Proveedor" del
 * paso Economía — quién cofinancia la promoción. Sin relación con
 * `listConditionSuppliers` (texto libre de `productos.proveedor`, "quién
 * fabrica este SKU"): son dos conceptos distintos.
 */
export async function listSuppliers(): Promise<SupplierOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((p) => ({ id: p.id, name: p.nombre }))
}

/**
 * `brand`/`price` (`marca`, `precio`) alimentan las columnas del picker de
 * productos (`ProductPickerRow`) — no requieren un join, ya son columnas
 * de `productos`.
 */
export type ProductOption = {
  id: string
  name: string
  sku: string
  brand: string | null
  price: number
}

/**
 * Duplica `listFreeProductOptions` de `features/coupons/lib/queries.ts`
 * (aislamiento entre features, CLAUDE.md §2) — tope de 50 por nombre,
 * mismo criterio que ese selector. `includeIds` agrega por una segunda
 * consulta cualquier producto ya guardado que no esté en el top 50, para
 * que al editar una promoción el producto elegido no se muestre como un
 * uuid crudo (mismo bug que existe hoy en `coupons/components/step-coupon.tsx`,
 * que no se repite aquí).
 */
export async function listProductOptionsForPromotions(
  includeIds: string[] = []
): Promise<ProductOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, sku, marca, precio")
    .eq("estado", "activo")
    .order("nombre")
    // El picker es un modal con buscador y sin tope de filas visibles, así
    // que el límite real de lo que se puede encontrar es este: con 50 no
    // había forma de llegar al producto 51 ni buscándolo por nombre.
    .limit(200)
  if (error) throw error
  const base = data ?? []

  const missingIds = includeIds.filter((id) => !base.some((p) => p.id === id))
  let extra: typeof base = []
  if (missingIds.length > 0) {
    const { data: extraData, error: extraError } = await supabase
      .from("productos")
      .select("id, nombre, sku, marca, precio")
      .in("id", missingIds)
    if (extraError) throw extraError
    extra = extraData ?? []
  }

  return [...base, ...extra].map((p) => ({
    id: p.id,
    name: p.nombre,
    sku: p.sku,
    brand: p.marca,
    price: p.precio,
  }))
}

export type CouponBatchOption = { id: string; reference: string; name: string }

/** Duplica `listCouponBatchesForBuilder` de `features/builder/canvas/queries.ts` — sin filtrar por `status`, mismo criterio. */
export async function listCouponBatchesForPromotions(): Promise<
  CouponBatchOption[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_batch")
    .select("id, reference, name")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Todas las opciones que alimentan el árbol de condiciones, en un solo
 * objeto — reemplaza las 4 props sueltas que tenían
 * `ConditionsBuilder`/`ConditionTreeGroup`/`ConditionLeafRow` antes de
 * las condiciones por atributos de socio/tienda/producto: llegar a 10
 * props sueltas para 10 listas ya no escalaba. `storeFormats` no viene de
 * una consulta — `tiendas.formato` está acotado por el mismo `check` que
 * la tupla `STORE_FORMATS` de `@/types/domain`, así que se pasa el
 * catálogo fijo, no un `SELECT DISTINCT` — mismo criterio para `genders`/
 * `maritalStatuses` (`members.genero`/`members.estado_civil`, acotados por
 * `GENDERS`/`MARITAL_STATUSES`).
 */
export type ConditionOptions = {
  categories: ConditionCategory[]
  // El campo condición `producto` reusa `ProductOption[]` (no un
  // `ConditionOption[]` de `{id, name}`) porque necesita buscador por
  // nombre/SKU/marca — el mismo `EntityPickerField` que ya usan
  // `producto_gratis`/`por_piezas`/`precio_especial` en el paso
  // Configuración, no el `Multiselect` en memoria de `categoria`/`brands`.
  products: ProductOption[]
  cities: ConditionCity[]
  segments: ConditionSegment[]
  couponBatches: CouponBatchOption[]
  tiers: ConditionTier[]
  provinces: ConditionOption[]
  storeRegions: ConditionOption[]
  storeFormats: ConditionOption[]
  storeGroups: ConditionStoreGroup[]
  brands: ConditionOption[]
  suppliers: ConditionOption[]
  genders: ConditionOption[]
  maritalStatuses: ConditionOption[]
}

// ── Panel de promociones · KPI universales, por mecánica y cofinanciación ──

export type DimensionSlice = {
  key: string
  label: string
  canjes: number
  inversion: number
  /**
   * Suma de `metadatos.monto_carrito` de los canjes. Es venta que PASÓ por
   * la promoción, no venta incremental: sin grupo de control no hay forma
   * de saber cuánta habría ocurrido igual. El nombre lo dice a propósito.
   */
  ventaAsociada: number
  /**
   * Las promociones que componen el corte, no solo cuántas son. Es lo que
   * deja pasar de "el laboratorio puso X" a "el laboratorio puso X, y el
   * 80 % se fue en una sola promoción" — que es la pregunta que sigue
   * siempre a la primera.
   */
  promociones: {
    id: string
    nombre: string
    canjes: number
    inversion: number
    ventaAsociada: number
  }[]
}

/** Las hojas del árbol de condiciones, sin importar cuán anidado esté. */
function conditionLeaves(
  condiciones: unknown
): { campo: string; valor: unknown }[] {
  if (!condiciones || typeof condiciones !== "object") return []
  const node = condiciones as Record<string, unknown>
  if (Array.isArray(node.condiciones)) {
    return node.condiciones.flatMap(conditionLeaves)
  }
  if (typeof node.campo === "string") {
    return [{ campo: node.campo, valor: node.valor }]
  }
  return []
}

/** Un campo de condición puede traer un valor suelto o un array — el panel siempre necesita la lista. */
function conditionValues(valor: unknown): string[] {
  if (Array.isArray(valor))
    return valor.filter((v): v is string => typeof v === "string")
  if (typeof valor === "string") return [valor]
  return []
}

/**
 * El panel recortado por una dimensión. Un canje se atribuye a CADA valor
 * de la dimensión al que apunta su promoción: una promoción dirigida a dos
 * segmentos suma sus canjes en los dos. Es reparto, no doble conteo —
 * sumar las barras no da el total del panel, y por eso la tarjeta lo dice
 * en pantalla en vez de dejar que alguien lo sume y se confunda.
 *
 * Las promociones sin ningún valor para la dimensión pedida (una promoción
 * de carrito no tiene segmento) caen en "Sin segmento": esconderlas haría
 * que el gráfico contara menos canjes que el KPI de arriba sin explicar por qué.
 */
export async function getRedemptionsByDimension(
  dimension: PromotionDimension,
  filters: PromotionsDashboardFilters = {}
): Promise<{ dimension: PromotionDimension; items: DimensionSlice[] }> {
  const supabase = await createClient()
  const { data: promos, error } = await applyDashboardFilters(
    supabase
      .from("promociones")
      .select(
        "id, nombre, tipo, tipo_beneficio, financiador, condiciones, presupuesto_consumido"
      ),
    filters
  )
  if (error) throw error
  const rows = promos ?? []
  if (rows.length === 0) return { dimension, items: [] }

  const { data: events, error: eventsError } = await supabase
    .from("promocion_eventos")
    .select("promocion_id, metadatos")
    .eq("tipo", "canje")
    .in(
      "promocion_id",
      rows.map((p) => p.id)
    )
  if (eventsError) throw eventsError

  const canjesByPromo = new Map<string, { canjes: number; venta: number }>()
  for (const row of events ?? []) {
    const acc = canjesByPromo.get(row.promocion_id) ?? { canjes: 0, venta: 0 }
    acc.canjes += 1
    const monto = (row.metadatos as Record<string, unknown>).monto_carrito
    if (typeof monto === "number") acc.venta += monto
    canjesByPromo.set(row.promocion_id, acc)
  }

  // Los ids de segmento y categoría se resuelven a nombre en una sola
  // consulta por tabla: sin esto el eje del gráfico serían UUID.
  const labelById = new Map<string, string>()
  if (dimension === "segmento" || dimension === "categoria") {
    const ids = new Set<string>()
    for (const p of rows) {
      for (const leaf of conditionLeaves(p.condiciones)) {
        if (leaf.campo === dimension)
          conditionValues(leaf.valor).forEach((v) => ids.add(v))
      }
    }
    if (ids.size > 0) {
      const table = dimension === "segmento" ? "segments" : "categorias"
      const { data: named } = await supabase
        .from(table)
        .select("id, nombre")
        .in("id", [...ids])
      for (const n of named ?? []) labelById.set(n.id, n.nombre)
    }
  }

  const EMPTY_LABEL: Record<PromotionDimension, string> = {
    segmento: "Sin segmento",
    categoria: "Sin categoría",
    socio_nivel: "Sin nivel",
    mecanica: "—",
    tipo: "—",
    financiador: "—",
  }

  function keysFor(
    promo: (typeof rows)[number]
  ): { key: string; label: string }[] {
    if (dimension === "mecanica") {
      return [
        {
          key: promo.tipo_beneficio,
          label: BENEFIT_TYPE_LABEL[promo.tipo_beneficio as BenefitType],
        },
      ]
    }
    if (dimension === "tipo") {
      return [
        {
          key: promo.tipo,
          label: PROMOTION_TYPE_LABEL[promo.tipo as PromotionType],
        },
      ]
    }
    if (dimension === "financiador") {
      return [
        {
          key: promo.financiador,
          label: FINANCIADOR_LABEL[promo.financiador as Financiador],
        },
      ]
    }
    const values = conditionLeaves(promo.condiciones)
      .filter((l) => l.campo === dimension)
      .flatMap((l) => conditionValues(l.valor))
    if (values.length === 0)
      return [{ key: "__sin__", label: EMPTY_LABEL[dimension] }]
    return values.map((v) => ({ key: v, label: labelById.get(v) ?? v }))
  }

  const slices = new Map<string, DimensionSlice>()
  for (const promo of rows) {
    const activity = canjesByPromo.get(promo.id) ?? { canjes: 0, venta: 0 }
    for (const { key, label } of keysFor(promo)) {
      const slice = slices.get(key) ?? {
        key,
        label,
        canjes: 0,
        inversion: 0,
        ventaAsociada: 0,
        promociones: [],
      }
      slice.canjes += activity.canjes
      slice.ventaAsociada += activity.venta
      slice.inversion += promo.presupuesto_consumido
      slice.promociones.push({
        id: promo.id,
        nombre: promo.nombre,
        canjes: activity.canjes,
        inversion: promo.presupuesto_consumido,
        ventaAsociada: activity.venta,
      })
      slices.set(key, slice)
    }
  }

  return {
    dimension,
    items: [...slices.values()]
      .map((slice) => ({
        ...slice,
        // La promoción que más pesa primero: es la que explica el corte.
        promociones: slice.promociones.sort(
          (a, b) => b.inversion - a.inversion || b.canjes - a.canjes
        ),
      }))
      .sort((a, b) => b.canjes - a.canjes || b.inversion - a.inversion),
  }
}

export type PromotionMechanicResults = {
  id: string
  nombre: string
  mecanica: BenefitType
  mecanicaLabel: string
  /** Canjes con metadatos en la bitácora — la muestra sobre la que se calculan los KPI. */
  sampleSize: number
  /** El contador de la fila. Distinto de `sampleSize` a propósito: ver el comentario de la función. */
  canjesTotales: number
  inversion: number
  ventaAsociada: number
  metrics: MechanicMetric[]
  breakdown: MechanicBreakdown | null
}

/**
 * Lo que hay que mirar cuando el panel está enfocado en UNA promoción: los
 * KPI de su mecánica, no los agregados que sirven para comparar campañas
 * entre sí. Un 3x2 y un cashback no se juzgan con el mismo número.
 *
 * `sampleSize` (canjes con bitácora) y `canjesTotales` (el contador de la
 * fila) se devuelven los dos y no coinciden: la bitácora es una muestra de
 * actividad reciente, no el ledger completo — no existe motor de checkout
 * (ver `20260823120000_promociones.sql`). Mostrar solo uno haría creer que
 * los KPI cubren todos los canjes; mostrar los dos deja claro sobre cuántos
 * se calcularon.
 */
export async function getPromotionMechanicResults(
  promocionId: string
): Promise<PromotionMechanicResults | null> {
  const supabase = await createClient()
  const { data: promo, error } = await supabase
    .from("promociones")
    .select("id, nombre, tipo_beneficio, canjes, presupuesto_consumido")
    .eq("id", promocionId)
    .maybeSingle()
  if (error) throw error
  if (!promo) return null

  const { data: events, error: eventsError } = await supabase
    .from("promocion_eventos")
    .select("metadatos")
    .eq("tipo", "canje")
    .eq("promocion_id", promocionId)
  if (eventsError) throw eventsError

  const canjes = (events ?? []).map(
    (e) => (e.metadatos as Record<string, unknown>) ?? {}
  )
  const mecanica = promo.tipo_beneficio as BenefitType
  const { metrics, breakdown } = mechanicKpis(mecanica, canjes)

  // Los desgloses por producto vienen con el UUID como etiqueta — se
  // resuelven aquí y no en `mechanic-kpis.ts` para que esa siga siendo
  // pura (sin Supabase) y testeable.
  let resolved = breakdown
  if (breakdown && breakdown.label === "Piezas por producto") {
    const { data: productos } = await supabase
      .from("productos")
      .select("id, nombre")
      .in(
        "id",
        breakdown.items.map((i) => i.key)
      )
    const nameById = new Map((productos ?? []).map((p) => [p.id, p.nombre]))
    resolved = {
      ...breakdown,
      items: breakdown.items.map((i) => ({
        ...i,
        label: nameById.get(i.key) ?? i.label,
      })),
    }
  }

  const ventaAsociada = canjes.reduce((acc, c) => {
    const monto = c.monto_carrito
    return acc + (typeof monto === "number" ? monto : 0)
  }, 0)

  return {
    id: promo.id,
    nombre: promo.nombre,
    mecanica,
    mecanicaLabel: BENEFIT_TYPE_LABEL[mecanica],
    sampleSize: canjes.length,
    canjesTotales: promo.canjes,
    inversion: promo.presupuesto_consumido,
    ventaAsociada,
    metrics,
    breakdown: resolved,
  }
}

export type CofinancingRow = {
  proveedorId: string | null
  proveedor: string
  /** Promociones distintas que ese proveedor cofinancia dentro del filtro. */
  promociones: number
  inversionTotal: number
  /** `inversionTotal × porcentaje_costo_proveedor` — lo que se le factura. */
  aCargoProveedor: number
  aCargoRetailer: number
  /** Unidades físicas entregadas con cargo al proveedor (`costo_producto`/`costo_tercero`). */
  piezas: number
  periodos: SettlementPeriod[]
  contratos: string[]
}

/**
 * Lo que hay que liquidar con cada proveedor. Es la mitad de "Economía" que
 * el panel no tenía: el formulario ya capturaba quién paga y en qué
 * porcentaje, pero nadie consolidaba el resultado, que es justo lo que
 * comercial necesita cuando llega el cierre del periodo.
 *
 * Dos monedas de cambio, no una: **dinero** (porcentaje del costo) y
 * **piezas** (unidades físicas que el laboratorio repone). Un 3x2 se
 * liquida en cajas, no en pesos, y consolidarlo solo en dinero obliga a
 * volver a abrir cada promoción para contar unidades.
 *
 * Las piezas solo cuentan cuando la naturaleza del costo es de producto o
 * de tercero: en un descuento de margen no hay pieza que reponer, y sumar
 * ahí las unidades del carrito daría un número que nadie puede facturar.
 */
export async function getCofinancingConsolidation(
  filters: PromotionsDashboardFilters = {}
): Promise<CofinancingRow[]> {
  const supabase = await createClient()
  const { data: promos, error } = await applyDashboardFilters(
    supabase.from("promociones").select(
      `id, financiador, naturaleza_costo, porcentaje_costo_proveedor,
         periodo_liquidacion, contrato_id, presupuesto_consumido,
         proveedor:proveedores!proveedor_id(id, nombre)`
    ),
    filters
  )
  if (error) throw error

  const cofinanced = (promos ?? []).filter((p) => p.financiador !== "retailer")
  if (cofinanced.length === 0) return []

  const { data: events, error: eventsError } = await supabase
    .from("promocion_eventos")
    .select("promocion_id, metadatos")
    .eq("tipo", "canje")
    .in(
      "promocion_id",
      cofinanced.map((p) => p.id)
    )
  if (eventsError) throw eventsError

  const piezasByPromo = new Map<string, number>()
  for (const row of events ?? []) {
    const cantidad = (row.metadatos as Record<string, unknown>).cantidad
    if (typeof cantidad !== "number") continue
    piezasByPromo.set(
      row.promocion_id,
      (piezasByPromo.get(row.promocion_id) ?? 0) + cantidad
    )
  }

  const byProvider = new Map<string, CofinancingRow>()
  for (const promo of cofinanced) {
    const proveedor = promo.proveedor
    const key = proveedor?.id ?? "__sin_proveedor__"
    const row = byProvider.get(key) ?? {
      proveedorId: proveedor?.id ?? null,
      // Un financiador no-retailer sin proveedor enlazado es un dato
      // incompleto del formulario, no una categoría: se nombra como tal
      // para que se vea y se corrija, en vez de repartirlo en "otros".
      proveedor: proveedor?.nombre ?? "Sin proveedor asignado",
      promociones: 0,
      inversionTotal: 0,
      aCargoProveedor: 0,
      aCargoRetailer: 0,
      piezas: 0,
      periodos: [],
      contratos: [],
    }
    const pct = (promo.porcentaje_costo_proveedor ?? 0) / 100
    row.promociones += 1
    row.inversionTotal += promo.presupuesto_consumido
    row.aCargoProveedor += promo.presupuesto_consumido * pct
    row.aCargoRetailer += promo.presupuesto_consumido * (1 - pct)
    if (
      promo.naturaleza_costo === "costo_producto" ||
      promo.naturaleza_costo === "costo_tercero"
    ) {
      row.piezas += piezasByPromo.get(promo.id) ?? 0
    }
    const periodo = promo.periodo_liquidacion as SettlementPeriod | null
    if (periodo && !row.periodos.includes(periodo)) row.periodos.push(periodo)
    if (promo.contrato_id && !row.contratos.includes(promo.contrato_id)) {
      row.contratos.push(promo.contrato_id)
    }
    byProvider.set(key, row)
  }

  return [...byProvider.values()].sort(
    (a, b) => b.aCargoProveedor - a.aCargoProveedor
  )
}

export type TopPromotionTrendSeries = {
  id: string
  nombre: string
  /** Canjes por semana, indexados por `weekKey` — 0 en las semanas sin actividad. */
  counts: Record<string, number>
  canjes: number
  inversion: number
  ventaAsociada: number
  /** Venta asociada / inversión, en múltiplos. `null` cuando falta cualquiera de los dos. */
  retorno: number | null
}

/**
 * Las promociones que más se canjean, como serie semanal en vez de como
 * lista. Una lista dice quién va primero; la serie dice si va subiendo o
 * cayendo, que es lo que decide si hay que hacer algo esta semana.
 *
 * El ranking sale de los canjes de la BITÁCORA, no de `promociones.canjes`.
 * Son números distintos (el contador de fila no tiene historia, ver
 * `20260823120000_promociones.sql`) y ordenar por uno mientras se dibuja el
 * otro produce el peor error posible en un top: que la línea más alta no sea
 * la primera de la lista.
 *
 * Las semanas se emiten completas para todas las series —incluidas las que
 * valen 0— para que recharts no una dos puntos saltándose el hueco y
 * dibuje una caída como si fuera una pendiente suave.
 */
export async function getTopPromotionsCanjesTrend(
  limit = 4,
  filters: PromotionsDashboardFilters = {}
): Promise<{
  weeks: { weekKey: string; weekLabel: string }[]
  series: TopPromotionTrendSeries[]
}> {
  const supabase = await createClient()
  const { data: promos, error } = await applyDashboardFilters(
    supabase.from("promociones").select("id, nombre, presupuesto_consumido"),
    filters
  )
  if (error) throw error
  const rows = promos ?? []
  if (rows.length === 0) return { weeks: [], series: [] }

  const { data: events, error: eventsError } = await supabase
    .from("promocion_eventos")
    .select("promocion_id, ocurrido_en, metadatos")
    .eq("tipo", "canje")
    .in(
      "promocion_id",
      rows.map((p) => p.id)
    )
  if (eventsError) throw eventsError

  const mondayByWeekKey = new Map<string, Date>()
  const byPromo = new Map<
    string,
    { counts: Map<string, number>; canjes: number; venta: number }
  >()
  for (const row of events ?? []) {
    const occurred = new Date(row.ocurrido_en)
    const monday = new Date(occurred)
    const day = monday.getDay()
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    const weekKey = toDateParam(monday)
    mondayByWeekKey.set(weekKey, monday)

    const acc = byPromo.get(row.promocion_id) ?? {
      counts: new Map<string, number>(),
      canjes: 0,
      venta: 0,
    }
    acc.counts.set(weekKey, (acc.counts.get(weekKey) ?? 0) + 1)
    acc.canjes += 1
    const monto = (row.metadatos as Record<string, unknown>).monto_carrito
    if (typeof monto === "number") acc.venta += monto
    byPromo.set(row.promocion_id, acc)
  }

  const top = rows
    .map((promo) => ({ promo, activity: byPromo.get(promo.id) }))
    .filter(
      (
        r
      ): r is {
        promo: (typeof rows)[number]
        activity: NonNullable<typeof r.activity>
      } => Boolean(r.activity && r.activity.canjes > 0)
    )
    .sort((a, b) => b.activity.canjes - a.activity.canjes)
    .slice(0, limit)

  if (top.length === 0) return { weeks: [], series: [] }

  // Solo las semanas en las que el top tuvo actividad: una semana vacía
  // arrastrada desde una promoción que quedó fuera del corte alarga el eje
  // sin añadir nada.
  const weekKeys = [
    ...new Set(top.flatMap(({ activity }) => [...activity.counts.keys()])),
  ].sort()

  return {
    weeks: weekKeys.map((weekKey) => ({
      weekKey,
      weekLabel: formatShortDate(mondayByWeekKey.get(weekKey)!),
    })),
    series: top.map(({ promo, activity }) => ({
      id: promo.id,
      nombre: promo.nombre,
      counts: Object.fromEntries(
        weekKeys.map((k) => [k, activity.counts.get(k) ?? 0])
      ),
      canjes: activity.canjes,
      inversion: promo.presupuesto_consumido,
      ventaAsociada: activity.venta,
      retorno:
        promo.presupuesto_consumido > 0 && activity.venta > 0
          ? activity.venta / promo.presupuesto_consumido
          : null,
    })),
  }
}
