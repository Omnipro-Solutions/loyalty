import { formatShortDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"
import type {
  BenefitType,
  ChannelScope,
  ConditionCombinator,
  Financiador,
  LimitExcessBehavior,
  LimitSubject,
  LimitUnit,
  LimitWindow,
  PromotionEventType,
  PromotionPublicationStatus,
  PromotionType,
} from "@/types/domain"

import { toDateParam, type DateWindow } from "./dashboard-filters"
import { promotionStatus, type PromotionStatus } from "./status"

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

export type PromotionsDashboardFilters = {
  window?: DateWindow
  tipos?: PromotionType[]
  canales?: ChannelScope[]
  financiadores?: Financiador[]
  promocionIds?: string[]
}

/**
 * Filtros de "Panel de promociones" compartidos por todas sus consultas —
 * una sola fuente de verdad para que nunca se desincronicen entre widgets.
 * La vigencia filtra por solape con la ventana (`vigente_desde < hasta` y
 * `vigente_hasta` nulo o `>= desde`), no por fecha de creación: no hay
 * evento con fecha real detrás, solo la vigencia de la fila (ver
 * `dashboard-filters.ts`).
 */
function applyDashboardFilters<
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

export type PromotionsDashboardKpis = {
  /** Un contador por estado — `Record` sobre `PromotionStatus` para que añadir un estado no deje este conteo desincronizado. */
  statusCounts: Record<PromotionStatus, number>
  assignedBudget: number
  consumedBudget: number
  consumedBudgetPct: number
  totalRedemptions: number
  avgCostPerRedemption: number | null
  alertCount: number
  avgRoi: number | null
  roiSampleSize: number
}

/**
 * KPIs de "Panel de promociones" (sin nodo Figma — nueva a pedido del
 * usuario). Todo sale de columnas reales de `promociones`: no hay tabla de
 * eventos de canje, así que esto es un corte transversal (snapshot), no una
 * serie de tiempo — mismo criterio que `getPromotionsSummary`.
 */
export async function getPromotionsDashboardKpis(
  filters: PromotionsDashboardFilters = {}
): Promise<PromotionsDashboardKpis> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase
      .from("promociones")
      .select(
        "estado_publicacion, vigente_desde, vigente_hasta, presupuesto_asignado, presupuesto_consumido, canjes, umbral_alerta_presupuesto_pct, roi"
      ),
    filters
  )
  if (error) throw error

  const statusCounts: Record<PromotionStatus, number> = {
    activa: 0,
    programada: 0,
    borrador: 0,
    inactiva: 0,
    finalizada: 0,
  }
  let assignedBudget = 0
  let consumedBudget = 0
  let totalRedemptions = 0
  let alertCount = 0
  let roiSum = 0
  let roiSampleSize = 0

  for (const row of data ?? []) {
    statusCounts[promotionStatus(row)] += 1
    assignedBudget += row.presupuesto_asignado
    consumedBudget += row.presupuesto_consumido
    totalRedemptions += row.canjes
    if (
      row.umbral_alerta_presupuesto_pct != null &&
      row.presupuesto_asignado > 0 &&
      row.presupuesto_consumido / row.presupuesto_asignado >=
        row.umbral_alerta_presupuesto_pct / 100
    ) {
      alertCount += 1
    }
    if (row.roi != null) {
      roiSum += row.roi
      roiSampleSize += 1
    }
  }

  return {
    statusCounts,
    assignedBudget,
    consumedBudget,
    consumedBudgetPct: assignedBudget > 0 ? consumedBudget / assignedBudget : 0,
    totalRedemptions,
    avgCostPerRedemption:
      totalRedemptions > 0 ? consumedBudget / totalRedemptions : null,
    alertCount,
    avgRoi: roiSampleSize > 0 ? roiSum / roiSampleSize : null,
    roiSampleSize,
  }
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

export type PromotionAlert =
  | {
      id: string
      severity: "warning"
      type: "presupuesto"
      nombre: string
      consumedPct: number
      thresholdPct: number
    }
  | {
      id: string
      severity: "destructive"
      type: "roi"
      nombre: string
      roi: number
    }

/**
 * Alertas reales (sin motor de reglas detrás, solo dos condiciones sobre
 * columnas existentes): sobreconsumo contra `umbral_alerta_presupuesto_pct`,
 * y `roi < 1` (el retorno registrado no cubre lo invertido).
 */
export async function getPromotionAlerts(
  limit = 4,
  filters: PromotionsDashboardFilters = {}
): Promise<PromotionAlert[]> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase
      .from("promociones")
      .select(
        "id, nombre, presupuesto_asignado, presupuesto_consumido, umbral_alerta_presupuesto_pct, roi"
      ),
    filters
  )
  if (error) throw error

  const alerts: PromotionAlert[] = []
  for (const row of data ?? []) {
    if (
      row.umbral_alerta_presupuesto_pct != null &&
      row.presupuesto_asignado > 0
    ) {
      const consumedPct = row.presupuesto_consumido / row.presupuesto_asignado
      if (consumedPct >= row.umbral_alerta_presupuesto_pct / 100) {
        alerts.push({
          id: `${row.id}-presupuesto`,
          severity: "warning",
          type: "presupuesto",
          nombre: row.nombre,
          consumedPct,
          thresholdPct: row.umbral_alerta_presupuesto_pct,
        })
      }
    }
    if (row.roi != null && row.roi < 1) {
      alerts.push({
        id: `${row.id}-roi`,
        severity: "destructive",
        type: "roi",
        nombre: row.nombre,
        roi: row.roi,
      })
    }
  }
  return alerts.slice(0, limit)
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
 * Bitácora de "Panel de promociones · Logs" — todos los eventos de
 * `promocion_eventos` de la org, más recientes primero. Es una muestra
 * representativa de actividad reciente, no un ledger reconciliado con
 * `canjes`/`presupuesto_consumido` (ver comentario de la migración
 * `20260826160000_promociones_eventos.sql`). Sin límite: a esta escala de
 * datos demo no hace falta paginar server-side — el filtro y el "cargar
 * más" corren en cliente, igual que `ProductHistoryCard`.
 */
export async function listPromotionEvents(): Promise<PromotionEventItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promocion_eventos")
    .select(
      "id, promocion_id, tipo, titulo, detalle, actor_etiqueta, canal, codigo_motivo, nota_motivo, metadatos, ocurrido_en"
    )
    .order("ocurrido_en", { ascending: false })
  if (error) throw error

  const promocionIds = [...new Set((data ?? []).map((row) => row.promocion_id))]
  const nameById = new Map<string, string>()
  if (promocionIds.length > 0) {
    const { data: promos, error: promosError } = await supabase
      .from("promociones")
      .select("id, nombre")
      .in("id", promocionIds)
    if (promosError) throw promosError
    for (const promo of promos ?? []) nameById.set(promo.id, promo.nombre)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    promocionId: row.promocion_id,
    promocionNombre: nameById.get(row.promocion_id) ?? "—",
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

export type ExpiringPromotion = {
  id: string
  nombre: string
  diasRestantes: number
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

/**
 * Promociones activas (de verdad activas hoy, no solo `estado_publicacion`)
 * cuya `vigente_hasta` cae dentro de `withinDays` — real, de la misma
 * columna que ya usa `validitySummary`. Rellena la barra lateral del panel
 * con una alerta operativa real en vez de dejarla vacía.
 */
export async function getPromotionsExpiringSoon(
  filters: PromotionsDashboardFilters = {},
  withinDays = 7
): Promise<ExpiringPromotion[]> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase
      .from("promociones")
      .select("id, nombre, estado_publicacion, vigente_desde, vigente_hasta"),
    filters
  )
  if (error) throw error

  const results: ExpiringPromotion[] = []
  for (const row of data ?? []) {
    if (!row.vigente_hasta) continue
    if (promotionStatus(row) !== "activa") continue
    const diasRestantes = daysUntil(row.vigente_hasta)
    if (diasRestantes >= 0 && diasRestantes <= withinDays) {
      results.push({ id: row.id, nombre: row.nombre, diasRestantes })
    }
  }
  return results.sort((a, b) => a.diasRestantes - b.diasRestantes)
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

/** Opción genérica {value, label} para los selectores de condición cuyo universo de valores es "los distintos que existan hoy en una columna de texto" (provincia, región, marca, proveedor) — sin tabla de catálogo propia detrás. */
export type ConditionOption = { value: string; label: string }

function distinctTextValues(values: (string | null)[]): ConditionOption[] {
  const unique = new Set(values.filter((v): v is string => Boolean(v)))
  return [...unique]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }))
}

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

/** Provincias reales con al menos un socio, para la condición "Provincia del socio". */
export async function listConditionProvinces(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("members").select("provincia")
  if (error) throw error
  return distinctTextValues((data ?? []).map((m) => m.provincia))
}

/** Regiones reales de Tiendas, para la condición "Región de la tienda". */
export async function listConditionStoreRegions(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tiendas").select("region")
  if (error) throw error
  return distinctTextValues((data ?? []).map((t) => t.region))
}

/** Marcas reales de Catálogo, para la condición "Marca del producto". */
export async function listConditionBrands(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("productos").select("marca")
  if (error) throw error
  return distinctTextValues((data ?? []).map((p) => p.marca))
}

/** Proveedores/laboratorios reales de Catálogo, para la condición "Proveedor / laboratorio". */
export async function listConditionSuppliers(): Promise<ConditionOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("productos").select("proveedor")
  if (error) throw error
  return distinctTextValues((data ?? []).map((p) => p.proveedor))
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
  brands: ConditionOption[]
  suppliers: ConditionOption[]
  genders: ConditionOption[]
  maritalStatuses: ConditionOption[]
}
