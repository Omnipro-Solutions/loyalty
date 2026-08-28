import { createClient } from "@/lib/supabase/server"
import type { BenefitType } from "@/types/domain"

import { formatWindowLabel } from "./dashboard-filters"
import {
  applyDashboardFilters,
  type PromotionsDashboardFilters,
} from "./queries"
import {
  benefitTotals,
  buildDistinctTrend,
  buildTrend,
  deltaRatio,
  resolveEfficiency,
  sortPerformance,
  type BenefitTotals,
  type ClassifiedCanje,
  type Efficiency,
  type PerformanceRow,
  type PerformanceSort,
  type TrendGrouping,
  type TrendMetric,
  type TrendPoint,
} from "./result-analytics"
import type { CanjeMetadata } from "./mechanic-kpis"

/**
 * Consultas del dashboard "Resultados de promociones".
 *
 * Vive aparte de `queries.ts` (que ya pasa de 2.300 líneas) porque contesta
 * otra pregunta: aquel panel mide lo DECLARADO (presupuesto, vigencia,
 * financiador) y este mide lo OCURRIDO — todo sale de `promocion_eventos`,
 * la única bitácora de promociones con fecha real, más las tablas de cupones
 * y de corridas del builder cuando la promoción se conecta con ellas.
 *
 * Las tres reglas que gobiernan el archivo:
 *
 * 1. **Sin evidencia se devuelve `null`, nunca cero** (spec §28). Un widget
 *    sin dato no se pinta; un cero dice "medimos y dio cero", que es una
 *    afirmación distinta y casi siempre falsa aquí.
 * 2. **Los cruces con Cupones y Builder se hacen por tabla, no importando
 *    esas features** — `features` están aisladas entre sí (CLAUDE.md §2).
 *    Leer `coupon_batch` desde aquí es lo mismo que este módulo ya hace con
 *    `pedidos`, `productos` o `segments`.
 * 3. **La ventana de período aquí filtra EVENTOS** (`ocurrido_en`), no la
 *    vigencia de la fila. Es la diferencia entre "qué promociones estaban
 *    vigentes" y "qué pasó en esos días", y esta vista contesta la segunda.
 */

// ── Alcance: qué promociones entran y con qué mecánica ───────────────────

type ScopedPromotion = {
  id: string
  nombre: string
  mecanica: BenefitType
  canjes: number
  presupuestoAsignado: number
  presupuestoConsumido: number
  umbralAlertaPct: number | null
  roi: number | null
}

async function resolveScope(
  filters: PromotionsDashboardFilters
): Promise<Map<string, ScopedPromotion>> {
  const supabase = await createClient()
  const { data, error } = await applyDashboardFilters(
    supabase
      .from("promociones")
      .select(
        "id, nombre, tipo_beneficio, canjes, presupuesto_asignado, presupuesto_consumido, umbral_alerta_presupuesto_pct, roi"
      ),
    filters
  )
  if (error) throw error

  return new Map(
    (data ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        nombre: row.nombre,
        mecanica: row.tipo_beneficio as BenefitType,
        canjes: row.canjes,
        presupuestoAsignado: row.presupuesto_asignado,
        presupuestoConsumido: row.presupuesto_consumido,
        umbralAlertaPct: row.umbral_alerta_presupuesto_pct,
        roi: row.roi,
      },
    ])
  )
}

type CanjeRow = {
  promocion_id: string
  member_id: string | null
  metadatos: CanjeMetadata
  ocurrido_en: string
}

/**
 * Los canjes con bitácora de un conjunto de promociones, opcionalmente
 * acotados a una ventana de tiempo. Sin `promocionIds` devuelve `[]` en vez
 * de consultar sin filtro: un `in` vacío en PostgREST trae TODO, que es
 * justo lo contrario de lo que pide un filtro que no seleccionó nada.
 */
async function fetchCanjes(
  promocionIds: string[],
  window?: { from: Date; to: Date }
): Promise<CanjeRow[]> {
  if (promocionIds.length === 0) return []
  const supabase = await createClient()
  let query = supabase
    .from("promocion_eventos")
    .select("promocion_id, member_id, metadatos, ocurrido_en")
    .eq("tipo", "canje")
    .in("promocion_id", promocionIds)

  if (window) {
    query = query
      .gte("ocurrido_en", window.from.toISOString())
      .lt("ocurrido_en", window.to.toISOString())
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    promocion_id: row.promocion_id,
    member_id: row.member_id,
    metadatos: (row.metadatos as CanjeMetadata) ?? {},
    ocurrido_en: row.ocurrido_en,
  }))
}

/**
 * La ventana inmediatamente anterior, del mismo largo. Es lo que da sentido
 * al "▲ 12,4 % vs período anterior" de la spec §7: sin ventana explícita no
 * hay período anterior que definir, y la variación se reporta como ausente
 * en vez de compararse contra toda la historia.
 */
function previousWindow(window?: { from: Date; to: Date }) {
  if (!window) return undefined
  const length = window.to.getTime() - window.from.getTime()
  return {
    from: new Date(window.from.getTime() - length),
    to: new Date(window.from.getTime()),
  }
}

function classify(
  canjes: CanjeRow[],
  scope: Map<string, ScopedPromotion>
): ClassifiedCanje[] {
  const out: ClassifiedCanje[] = []
  for (const canje of canjes) {
    const promo = scope.get(canje.promocion_id)
    if (!promo) continue
    out.push({ mecanica: promo.mecanica, metadatos: canje.metadatos })
  }
  return out
}

// ── §20 · Embudo de cupones ──────────────────────────────────────────────

export type CouponFunnel = {
  generated: number
  delivered: number
  redeemed: number
  expired: number
  cancelled: number
  /** Fracción 0-1. `null` sin entregados (nada que dividir). */
  redemptionRate: number | null
  pointsRedeemed: number
  pointsCommitted: number
  batchCount: number
}

/** Día calendario en UTC — mismo criterio que `status.ts`, para que la hora no mueva el límite. */
function dateOnly(value: string | Date): number {
  const d = typeof value === "string" ? new Date(value) : value
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Embudo de los cupones emitidos por estas promociones (`coupon_batch.
 * promotion_id`). `expired` se DERIVA cruzando el estado con `valid_to` —
 * no es un valor almacenado; la regla se reimplementa aquí en vez de
 * importarla de `features/coupons` por el aislamiento entre features
 * (CLAUDE.md §2), igual que `collision.ts` reimplementa `flatten`.
 *
 * `null` cuando ninguna promoción del filtro tiene cupones enlazados: el
 * bloque entero no se pinta, en vez de mostrar cuatro ceros.
 */
export async function getCouponFunnel(
  filters: PromotionsDashboardFilters
): Promise<CouponFunnel | null> {
  const scope = await resolveScope(filters)
  const promocionIds = [...scope.keys()]
  if (promocionIds.length === 0) return null

  const supabase = await createClient()
  const { data: batches, error: batchError } = await supabase
    .from("coupon_batch")
    .select("id")
    .in("promotion_id", promocionIds)
  if (batchError) throw batchError

  const batchIds = (batches ?? []).map((b) => b.id)
  if (batchIds.length === 0) return null

  const { data: coupons, error } = await supabase
    .from("coupon")
    .select("status, valid_to, points_cost")
    .in("batch_id", batchIds)
  if (error) throw error

  const now = new Date()
  let delivered = 0
  let redeemed = 0
  let expired = 0
  let cancelled = 0
  let pointsRedeemed = 0
  let pointsCommitted = 0

  for (const c of coupons ?? []) {
    const isExpired =
      c.status !== "redeemed" &&
      c.status !== "cancelled" &&
      !!c.valid_to &&
      dateOnly(c.valid_to) < dateOnly(now)
    const status = isExpired ? "expired" : c.status
    const points = c.points_cost ?? 0

    if (status === "cancelled") {
      cancelled += 1
      continue
    }
    // "Entregado" = llegó a existir para un cliente. `draft` no cuenta:
    // todavía no salió de la emisión.
    if (status === "draft") continue

    delivered += 1
    if (status === "redeemed") {
      redeemed += 1
      pointsRedeemed += points
    } else if (status === "expired") {
      expired += 1
    } else {
      // issued/assigned: vivos, su costo en puntos es un compromiso todavía
      // no realizado.
      pointsCommitted += points
    }
  }

  return {
    generated: (coupons ?? []).length,
    delivered,
    redeemed,
    expired,
    cancelled,
    redemptionRate: delivered > 0 ? redeemed / delivered : null,
    pointsRedeemed,
    pointsCommitted,
    batchCount: batchIds.length,
  }
}

// ── §7 · KPI transversales de resultado ──────────────────────────────────

export type ResultKpis = {
  /** Beneficios utilizados: canjes con bitácora, no el contador de fila. */
  uses: number
  usesDelta: number | null
  customers: number
  customersDelta: number | null
  /** Fracción 0-1. `null` cuando ninguna mecánica del filtro tiene denominador real. */
  utilization: number | null
  /** Variación en PUNTOS porcentuales, no relativa. */
  utilizationDelta: number | null
  benefit: BenefitTotals
  efficiency: Efficiency | null
  /** Cuántos canjes del período no traen `member_id` — hace legible el hueco de "clientes". */
  usesWithoutMember: number
  /**
   * Suma de `promociones.canjes`, el contador de fila. Se expone junto a
   * `uses` a propósito: los dos son ciertos y casi nunca coinciden —el
   * contador acumula toda la vida de la promoción, la bitácora solo los
   * canjes con evento registrado—, así que enseñar uno sin el otro hace
   * pensar que el panel está roto cuando se compara con `/promociones`.
   */
  usesCounter: number
  /** Presupuesto de las promociones filtradas — declarado, no observado. */
  assignedBudget: number
  consumedBudget: number
  /** Fracción 0-1. `null` sin presupuesto asignado: no hay nada de lo que consumir un porcentaje. */
  consumedBudgetPct: number | null
  hasWindow: boolean
  /**
   * "1 jul – 30 jul 2026" — contra qué se compara la variación. Un "▲ 12 %"
   * sin decir contra qué período es un número que no se puede verificar.
   */
  previousWindowLabel: string | null
  /**
   * Series semanales para los sparkline de las tarjetas. Solo las tres
   * métricas que SON una serie: utilización, presupuesto y eficiencia son
   * acumulados o razones sin historia, y dibujarles una curva inventaría su
   * forma. Vacío = la tarjeta no pinta sparkline (§28).
   */
  usesSpark: number[]
  customersSpark: number[]
  benefitSpark: number[]
}

/**
 * Los cinco KPI de la cabecera (spec §7).
 *
 * "Beneficios utilizados" sale de `promocion_eventos`, NO de
 * `promociones.canjes`: el contador de fila no tiene fecha, así que no se
 * puede acotar a un período ni comparar con el anterior. Los dos números
 * pueden diferir y eso es correcto — el pie del bloque de mecánica ya
 * explica que la bitácora es una muestra.
 */
export async function getResultKpis(
  filters: PromotionsDashboardFilters
): Promise<ResultKpis> {
  const scope = await resolveScope(filters)
  const promocionIds = [...scope.keys()]
  const prev = previousWindow(filters.window)

  const [current, previousCanjes, funnel] = await Promise.all([
    fetchCanjes(promocionIds, filters.window),
    prev ? fetchCanjes(promocionIds, prev) : Promise.resolve(null),
    getCouponFunnel(filters),
  ])

  const customersOf = (rows: CanjeRow[]) =>
    new Set(rows.map((r) => r.member_id).filter((id): id is string => !!id))
      .size

  const uses = current.length
  const customers = customersOf(current)

  let consumedBudget = 0
  let assignedBudget = 0
  let usesCounter = 0
  let roiSum = 0
  let roiSampleSize = 0
  for (const promo of scope.values()) {
    consumedBudget += promo.presupuestoConsumido
    assignedBudget += promo.presupuestoAsignado
    usesCounter += promo.canjes
    if (promo.roi != null) {
      roiSum += promo.roi
      roiSampleSize += 1
    }
  }

  const classified = classify(current, scope)
  const benefitUnit = benefitTotals(classified).headline?.unit ?? null

  return {
    uses,
    usesDelta: deltaRatio(uses, previousCanjes?.length ?? null),
    customers,
    customersDelta: deltaRatio(
      customers,
      previousCanjes ? customersOf(previousCanjes) : null
    ),
    utilization: funnel?.redemptionRate ?? null,
    // Siempre ausente, a propósito: el embudo de cupones no se puede
    // recortar por período (`coupon` guarda la fecha del último cambio de
    // estado, no la de cada uno), así que no hay un "período anterior" de
    // la utilización contra el que comparar. Declararlo `null` aquí es lo
    // que hace que la UI muestre "—" en vez de un 0 pp que parecería
    // "no cambió".
    utilizationDelta: null,
    benefit: benefitTotals(classified),
    efficiency: resolveEfficiency({
      avgRoi: roiSampleSize > 0 ? roiSum / roiSampleSize : null,
      roiSampleSize,
      consumedBudget,
      uses,
      redemptionRate: funnel?.redemptionRate ?? null,
    }),
    usesSpark: buildTrend(
      current,
      (r) => r.ocurrido_en,
      () => 1,
      "semana"
    ).map((p) => p.value),
    customersSpark: buildDistinctTrend(
      current,
      (r) => r.ocurrido_en,
      (r) => r.member_id,
      "semana"
    ).map((p) => p.value),
    // Solo suma lo que comparte unidad con el titular: mezclar piezas con
    // dólares en la misma curva no significa nada.
    benefitSpark: buildTrend(
      current,
      (r) => r.ocurrido_en,
      (row) => {
        const promo = scope.get(row.promocion_id)
        if (!promo || benefitUnit === null) return null
        const single = benefitTotals([
          { mecanica: promo.mecanica, metadatos: row.metadatos },
        ])
        if (!single.headline || single.headline.unit !== benefitUnit)
          return null
        return single.headline.value
      },
      "semana"
    ).map((p) => p.value),
    usesWithoutMember: current.filter((r) => !r.member_id).length,
    usesCounter,
    assignedBudget,
    consumedBudget,
    consumedBudgetPct:
      assignedBudget > 0 ? consumedBudget / assignedBudget : null,
    hasWindow: !!filters.window,
    previousWindowLabel: prev ? formatWindowLabel(prev) : null,
  }
}

// ── §9 · Evolución del resultado ─────────────────────────────────────────

export type ResultTrend = {
  points: TrendPoint[]
  metric: TrendMetric
  grouping: TrendGrouping
  /** Unidad del eje — decide el formato del tooltip sin que la UI adivine. */
  unit: "count" | "money" | "points" | "units"
}

/**
 * Serie de tiempo del resultado. Las tres métricas salen de eventos con
 * `ocurrido_en` real.
 *
 * La spec (§9) proponía "Usos · Valor · **Presupuesto**". `presupuesto_
 * consumido` es un contador de fila sin historia: dibujarlo como serie
 * sería inventar la forma de la curva, que es exactamente lo que prohíbe su
 * propia §28. Se sustituye por **Clientes** —socios distintos por bucket,
 * dato real— y el presupuesto se muestra como lo que sí es: un acumulado,
 * en su propio bloque (§24).
 */
export async function getResultTrend(
  filters: PromotionsDashboardFilters,
  metric: TrendMetric,
  grouping: TrendGrouping
): Promise<ResultTrend> {
  const scope = await resolveScope(filters)
  const canjes = await fetchCanjes([...scope.keys()], filters.window)

  if (metric === "clientes") {
    return {
      points: buildDistinctTrend(
        canjes,
        (r) => r.ocurrido_en,
        (r) => r.member_id,
        grouping
      ),
      metric,
      grouping,
      unit: "count",
    }
  }

  if (metric === "usos") {
    return {
      points: buildTrend(
        canjes,
        (r) => r.ocurrido_en,
        () => 1,
        grouping
      ),
      metric,
      grouping,
      unit: "count",
    }
  }

  // "Valor": solo entran los canjes cuya mecánica aporta a la unidad del
  // titular; mezclar piezas con dólares en un mismo eje no significa nada.
  const totals = benefitTotals(classify(canjes, scope))
  const unit = totals.headline?.unit ?? "money"
  const points = buildTrend(
    canjes,
    (r) => r.ocurrido_en,
    (row) => {
      const promo = scope.get(row.promocion_id)
      if (!promo) return null
      const single = benefitTotals([
        { mecanica: promo.mecanica, metadatos: row.metadatos },
      ])
      if (!single.headline || single.headline.unit !== unit) return null
      return single.headline.value
    },
    grouping
  )

  return { points, metric, grouping, unit }
}

// ── §10 · Desempeño del portafolio ───────────────────────────────────────

export type PerformanceTable = {
  rows: PerformanceRow[]
  sort: PerformanceSort
}

/**
 * Una fila por promoción con canjes en el período. Las que no tienen ningún
 * canje quedan fuera: el ranking compara resultados, y una promoción sin
 * uso no tiene un resultado peor, tiene ninguno — mezclarlas empuja al
 * fondo de la tabla filas que nadie necesita ver ahí.
 */
export async function getPromotionPerformance(
  filters: PromotionsDashboardFilters,
  sort: PerformanceSort
): Promise<PerformanceTable> {
  const scope = await resolveScope(filters)
  const promocionIds = [...scope.keys()]
  const canjes = await fetchCanjes(promocionIds, filters.window)

  const supabase = await createClient()
  // Utilización real por promoción: solo existe donde hay cupones enlazados.
  // Sin promociones en el filtro no se consulta: `promotion_id` es `uuid`, y
  // un centinela de texto reventaría la consulta con "invalid input syntax
  // for type uuid" en vez de devolver vacío.
  const batches =
    promocionIds.length > 0
      ? (
          await supabase
            .from("coupon_batch")
            .select("id, promotion_id, generated_count, redeemed_count")
            .in("promotion_id", promocionIds)
        ).data
      : []

  const couponsByPromotion = new Map<
    string,
    { generated: number; redeemed: number }
  >()
  for (const batch of batches ?? []) {
    if (!batch.promotion_id) continue
    const acc = couponsByPromotion.get(batch.promotion_id) ?? {
      generated: 0,
      redeemed: 0,
    }
    acc.generated += batch.generated_count
    acc.redeemed += batch.redeemed_count
    couponsByPromotion.set(batch.promotion_id, acc)
  }

  const usesByPromotion = new Map<string, number>()
  const membersByPromotion = new Map<string, Set<string>>()
  for (const canje of canjes) {
    usesByPromotion.set(
      canje.promocion_id,
      (usesByPromotion.get(canje.promocion_id) ?? 0) + 1
    )
    if (!canje.member_id) continue
    const set = membersByPromotion.get(canje.promocion_id) ?? new Set<string>()
    set.add(canje.member_id)
    membersByPromotion.set(canje.promocion_id, set)
  }

  const rows: PerformanceRow[] = []
  for (const promo of scope.values()) {
    const usos = usesByPromotion.get(promo.id) ?? 0
    if (usos === 0) continue
    const coupons = couponsByPromotion.get(promo.id)
    rows.push({
      id: promo.id,
      nombre: promo.nombre,
      mecanica: promo.mecanica,
      usos,
      clientes: membersByPromotion.get(promo.id)?.size ?? 0,
      utilizacion:
        coupons && coupons.generated > 0
          ? coupons.redeemed / coupons.generated
          : null,
      resultado: promo.roi,
      costo: promo.presupuestoConsumido,
    })
  }

  return { rows: sortPerformance(rows, sort), sort }
}

// ── §24 · Presupuesto ────────────────────────────────────────────────────

export type BudgetBlock = {
  assigned: number
  consumed: number
  available: number
  consumedPct: number
  /** Umbral de alerta más bajo entre las promociones del filtro — el primero que se cruza. */
  alertPct: number | null
  overThreshold: number
}

export async function getBudgetBlock(
  filters: PromotionsDashboardFilters
): Promise<BudgetBlock> {
  const scope = await resolveScope(filters)
  let assigned = 0
  let consumed = 0
  let alertPct: number | null = null
  let overThreshold = 0

  for (const promo of scope.values()) {
    assigned += promo.presupuestoAsignado
    consumed += promo.presupuestoConsumido
    if (promo.umbralAlertaPct != null) {
      alertPct =
        alertPct === null
          ? promo.umbralAlertaPct
          : Math.min(alertPct, promo.umbralAlertaPct)
      if (
        promo.presupuestoAsignado > 0 &&
        promo.presupuestoConsumido / promo.presupuestoAsignado >=
          promo.umbralAlertaPct / 100
      ) {
        overThreshold += 1
      }
    }
  }

  return {
    assigned,
    consumed,
    available: Math.max(0, assigned - consumed),
    consumedPct: assigned > 0 ? consumed / assigned : 0,
    alertPct,
    overThreshold,
  }
}

// ── §21-22 · Resultado de la regla del builder ───────────────────────────

/**
 * De dónde le llegó la cohorte a un paso. La distinción no es cosmética: en
 * un grafo con ramas, un nodo con menos gente que su antecesor puede ser una
 * **caída** (se perdieron por el camino) o simplemente una **rama** (el flujo
 * se partió y este es uno de los lados). Presentar las dos como "−60 %"
 * haría leer como fuga lo que es un `no_cumple` funcionando bien.
 */
export type JourneyInflow =
  { kind: "caida"; ratio: number } | { kind: "rama"; ratio: number }

export type JourneyStep = {
  nodeId: string
  label: string
  tipo: string
  count: number
  /** Profundidad en el grafo — dos nodos con la misma están en paralelo. */
  depth: number
  /** Fracción de la cohorte que entró a la regla. */
  share: number | null
  inflow: JourneyInflow | null
}

export type JourneyResult = {
  workflowId: string
  workflowName: string
  steps: JourneyStep[]
  /** Cohorte que entró a la corrida. */
  cohort: number
  /**
   * Fracción de la base de socios con evidencia real de haber pasado por
   * esta regla (`points_ledger.workflow_run_id`). `null` cuando la regla no
   * dejó ningún movimiento vinculado — que NO es cero: es que no hay con qué
   * medirlo.
   */
  reach: number | null
  reachMembers: number | null
}

/**
 * El recorrido de resultados de las reglas que aplican ESTA promoción
 * (bloque `aplicar_promocion` con `promocion_id` en su config).
 *
 * Deliberadamente NO es el canvas (spec §21): para editar el grafo ya está
 * el builder. Aquí solo interesa por dónde avanzó la gente y dónde está la
 * mayor fuga, así que se recorre la topología real (`workflow_edges`) y cada
 * paso se compara con sus antecesores DIRECTOS — ordenar por posición en el
 * lienzo y restar el paso anterior produce caídas negativas en cuanto el
 * grafo tiene dos ramas, porque compara nodos que están en paralelo.
 *
 * Lo que se reporta como alcance es la atribución real de `points_ledger`,
 * no la cohorte de la corrida: esa cohorte es una proyección del simulador y
 * puede ser mayor que toda la base de socios, así que dividirla entre los
 * socios daría porcentajes por encima de 100 %.
 */
export async function getPromotionJourneyResults(
  promocionId: string
): Promise<JourneyResult[]> {
  const supabase = await createClient()

  const { data: nodes, error } = await supabase
    .from("workflow_nodes")
    .select("workflow_id, config")
    .eq("tipo", "aplicar_promocion")
  if (error) throw error

  const workflowIds = [
    ...new Set(
      (nodes ?? [])
        .filter((n) => {
          const config = (n.config ?? {}) as Record<string, unknown>
          return config.promocion_id === promocionId
        })
        .map((n) => n.workflow_id)
    ),
  ]
  if (workflowIds.length === 0) return []

  const [{ data: workflows }, { data: runs }, { count: totalMembers }] =
    await Promise.all([
      supabase.from("workflows").select("id, nombre").in("id", workflowIds),
      supabase
        .from("workflow_runs")
        .select("id, workflow_id, iniciado_en")
        .in("workflow_id", workflowIds)
        .eq("tipo", "publicacion")
        .order("iniciado_en", { ascending: false }),
      supabase.from("members").select("*", { count: "exact", head: true }),
    ])

  // Una corrida por workflow: la más reciente. Varias corridas del mismo
  // workflow describen momentos distintos, y sumarlas contaría al mismo
  // socio tantas veces como corridas haya.
  const latestRunByWorkflow = new Map<string, string>()
  for (const run of runs ?? []) {
    if (!latestRunByWorkflow.has(run.workflow_id)) {
      latestRunByWorkflow.set(run.workflow_id, run.id)
    }
  }
  if (latestRunByWorkflow.size === 0) return []

  const [
    { data: steps },
    { data: allNodes },
    { data: edges },
    { data: ledger },
  ] = await Promise.all([
    supabase
      .from("workflow_run_steps")
      .select("workflow_run_id, node_id, conteo_entrada")
      .in("workflow_run_id", [...latestRunByWorkflow.values()]),
    supabase
      .from("workflow_nodes")
      .select("id, workflow_id, tipo, etiqueta, posicion_y")
      .in("workflow_id", workflowIds),
    supabase
      .from("workflow_edges")
      .select("workflow_id, source_node_id, target_node_id")
      .in("workflow_id", workflowIds),
    // Atribución real: TODAS las corridas del workflow cuentan, no solo la
    // última — un socio que pasó por una corrida anterior también pasó por
    // la regla.
    supabase
      .from("points_ledger")
      .select("member_id, workflow_run_id")
      .in(
        "workflow_run_id",
        (runs ?? []).map((r) => r.id)
      ),
  ])

  const runToWorkflow = new Map(
    (runs ?? []).map((r) => [r.id, r.workflow_id] as const)
  )
  const membersByWorkflow = new Map<string, Set<string>>()
  for (const row of ledger ?? []) {
    const workflowId = row.workflow_run_id
      ? runToWorkflow.get(row.workflow_run_id)
      : undefined
    if (!workflowId) continue
    const set = membersByWorkflow.get(workflowId) ?? new Set<string>()
    set.add(row.member_id)
    membersByWorkflow.set(workflowId, set)
  }

  const nameById = new Map((workflows ?? []).map((w) => [w.id, w.nombre]))

  const results: JourneyResult[] = []
  for (const [workflowId, runId] of latestRunByWorkflow) {
    const countByNode = new Map<string, number>()
    for (const step of steps ?? []) {
      if (step.workflow_run_id !== runId) continue
      countByNode.set(step.node_id, step.conteo_entrada ?? 0)
    }
    if (countByNode.size === 0) continue

    const graphNodes = (allNodes ?? []).filter(
      (n) => n.workflow_id === workflowId && countByNode.has(n.id)
    )
    const graphEdges = (edges ?? []).filter(
      (e) =>
        e.workflow_id === workflowId &&
        countByNode.has(e.source_node_id) &&
        countByNode.has(e.target_node_id)
    )

    const parentsOf = new Map<string, string[]>()
    const childCount = new Map<string, number>()
    for (const edge of graphEdges) {
      parentsOf.set(edge.target_node_id, [
        ...(parentsOf.get(edge.target_node_id) ?? []),
        edge.source_node_id,
      ])
      childCount.set(
        edge.source_node_id,
        (childCount.get(edge.source_node_id) ?? 0) + 1
      )
    }

    // Profundidad por relajación: `depth[hijo] = max(depth[padre]) + 1`. El
    // tope de iteraciones es la guarda contra un borrador con un ciclo — sin
    // él la relajación no terminaría.
    const depth = new Map<string, number>(graphNodes.map((n) => [n.id, 0]))
    for (let i = 0; i < graphNodes.length; i += 1) {
      let changed = false
      for (const edge of graphEdges) {
        const next = (depth.get(edge.source_node_id) ?? 0) + 1
        if (next > (depth.get(edge.target_node_id) ?? 0)) {
          depth.set(edge.target_node_id, next)
          changed = true
        }
      }
      if (!changed) break
    }

    const ordered = [...graphNodes].sort((a, b) => {
      const da = depth.get(a.id) ?? 0
      const db = depth.get(b.id) ?? 0
      return da !== db ? da - db : a.posicion_y - b.posicion_y
    })

    const cohort = countByNode.get(ordered[0]?.id ?? "") ?? 0

    const journeySteps: JourneyStep[] = ordered.map((node) => {
      const count = countByNode.get(node.id) ?? 0
      const parents = parentsOf.get(node.id) ?? []

      let inflow: JourneyInflow | null = null
      if (parents.length > 0) {
        // Misma regla que el simulador (`engine/simulate.ts`): una unión
        // reanuda a las MISMAS personas que se habían separado, así que su
        // antecesor efectivo es el mayor, no la suma.
        const parentCounts = parents.map((id) => countByNode.get(id) ?? 0)
        const parentTotal =
          node.tipo === "union"
            ? Math.max(...parentCounts)
            : parentCounts.reduce((a, b) => a + b, 0)
        if (parentTotal > 0) {
          // Si el antecesor reparte en más de una salida, esto es una rama
          // del flujo, no gente que se perdió.
          const splits = parents.some((id) => (childCount.get(id) ?? 0) > 1)
          inflow = splits
            ? { kind: "rama", ratio: count / parentTotal }
            : { kind: "caida", ratio: 1 - count / parentTotal }
        }
      }

      return {
        nodeId: node.id,
        label: node.etiqueta,
        tipo: node.tipo,
        count,
        depth: depth.get(node.id) ?? 0,
        share: cohort > 0 ? count / cohort : null,
        inflow,
      }
    })

    const reachMembers = membersByWorkflow.get(workflowId)?.size ?? null
    results.push({
      workflowId,
      workflowName: nameById.get(workflowId) ?? "Regla sin nombre",
      steps: journeySteps,
      cohort,
      reach:
        reachMembers !== null && totalMembers && totalMembers > 0
          ? reachMembers / totalMembers
          : null,
      reachMembers,
    })
  }

  return results
}
