import { formatNumber } from "@/lib/format"
import { STATUS_CHANGE_REASON_LABEL } from "@/lib/publication-status"
import { createClient } from "@/lib/supabase/server"
import {
  hasStatusEventsTable,
  hasV2Schema,
  LIFECYCLE_FALLBACK,
  nodeFromDb,
  statusFromDb,
  statusToDb,
} from "./schema-compat"
import type {
  BuilderNodeType,
  CouponBatchStatus,
  CouponDiscountType,
  CouponOrigin,
  StatusChangeReason,
  TierName,
  WorkflowExclusivity,
  WorkflowStatus,
} from "@/types/domain"

export type TierSummary = { nombre: TierName; multiplicador: number }

/** Multiplicadores reales por nivel — alimenta la vista previa en vivo de `acumular_puntos`. */
export async function listTiers(): Promise<TierSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tiers")
    .select("nombre, multiplicador")
    .order("orden")
  return (data ?? []).map((t) => ({
    nombre: t.nombre as TierName,
    multiplicador: t.multiplicador,
  }))
}

export type AudienceSummary = {
  id: string
  name: string
  estimatedCount: number | null
}

/** Audiencias reales de 11 · Audiencias (`segments`), para el selector "Audiencia" del bloque "Entra al segmento" — duplicado de `features/audiences` por aislamiento entre features (ver CLAUDE.md §2). */
export async function listAudiences(): Promise<AudienceSummary[]> {
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

export type CouponBatchSummary = {
  id: string
  reference: string
  name: string
  /**
   * Datos de la emisión que el bloque `emitir_cupon` NO vuelve a preguntar:
   * se materializan en cada cupón al generarlo (ver el comentario de
   * `coupon.discount_type` en la migración de cupones). El inspector los
   * muestra en solo lectura, para que quien configura la regla sepa qué va a
   * emitir sin ir a Cupones — y para que quede claro dónde se cambian.
   */
  discountType: CouponDiscountType
  discountValue: number
  currency: string
  maxUsesPerCoupon: number
  status: CouponBatchStatus
  /**
   * De dónde nace el lote. Lo necesita el bloque `emitir_cupon` para
   * respetar los constraints reales en la UI en vez de dejar construir algo
   * que la base rechazará: un lote `batch_anonymous` no admite titular
   * (`coupon_bearer_or_member`).
   */
  origin: CouponOrigin
  validFrom: string
  validTo: string | null
  /** `requested_quantity - generated_count`: cuántos quedan por generar en el lote. */
  remaining: number
  deliveryChannels: string[]
}

/**
 * Emisiones reales del módulo de cupones (`coupon_batch`), para el
 * selector "Emisión base" del bloque `emitir_cupon` — duplicado de
 * `features/coupons` por aislamiento entre features (ver CLAUDE.md §2).
 * Sin filtrar por `status`: mismo criterio que `listAudiences()`, que
 * tampoco filtra por `estado`.
 */
export async function listCouponBatchesForBuilder(): Promise<
  CouponBatchSummary[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("coupon_batch")
    .select(
      `id, reference, name, discount_type, discount_value, currency,
       max_uses_per_coupon, status, origin, valid_from, valid_to,
       requested_quantity, generated_count, delivery_channels`
    )
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((b) => ({
    id: b.id,
    reference: b.reference,
    name: b.name,
    discountType: b.discount_type as CouponDiscountType,
    discountValue: b.discount_value,
    currency: b.currency,
    maxUsesPerCoupon: b.max_uses_per_coupon,
    status: b.status as CouponBatchStatus,
    origin: b.origin as CouponOrigin,
    validFrom: b.valid_from,
    validTo: b.valid_to,
    remaining: Math.max(0, b.requested_quantity - b.generated_count),
    deliveryChannels: b.delivery_channels,
  }))
}

export type PromotionSummary = { id: string; name: string }

/**
 * Promociones reales del módulo de promociones (`promociones`), para el
 * selector "Promoción" del bloque `aplicar_promocion` — duplicado de
 * `features/promotions` por aislamiento entre features (ver CLAUDE.md §2).
 * Sin filtrar por `estado_publicacion`: mismo criterio que `listAudiences()`
 * y `listCouponBatchesForBuilder()`, que tampoco filtran por estado.
 */
export async function listPromotionsForBuilder(): Promise<PromotionSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promociones")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return (data ?? []).map((p) => ({ id: p.id, name: p.nombre }))
}

export type WorkflowListItem = {
  id: string
  nombre: string
  descripcion: string | null
  estado: WorkflowStatus
  /** La tabla muestra el estado DERIVADO (`programada`), y para derivarlo hace falta la vigencia. */
  vigente_desde: string
  vigente_hasta: string | null
  prioridad: number
  exclusividad: WorkflowExclusivity
  actualizado_en: string
  authorName: string | null
  totalNodes: number
  /** `null` = sin evidencia real todavía (ningún socio con un `points_ledger` vinculado a una corrida de este workflow) — se muestra "—", no un placeholder inventado. Ver `getAttributionByWorkflow`. */
  inJourney: number | null
  conversion: number | null
  revenue: number | null
}

export type WorkflowAttribution = {
  inJourney: number
  conversion: number
  revenue: number
}

export type GlobalAttribution = {
  membersInJourney: number | null
  averageConversion: number | null
  attributedRevenue: number | null
}

/**
 * "En recorrido"/"Conversión"/"Ingreso" (08.2, Figma): a diferencia del
 * resto de la app, esto SÍ se puede calcular de verdad — `points_ledger`
 * tiene una columna `workflow_run_id` pensada exactamente para vincular un
 * movimiento de puntos a la corrida que lo generó. Un socio "pasó por" un
 * workflow si tiene al menos un movimiento vinculado a alguna de sus
 * corridas; "conversión" = qué fracción de la base total de socios llegó a
 * ese workflow (no la tasa de finalización dentro del embudo — esa ya la
 * muestra la página de analítica con los conteos de `workflow_run_steps`,
 * es una pregunta distinta); "ingreso" = compras reales y completadas de
 * esos socios. Workflows sin ningún movimiento vinculado no aparecen en el
 * mapa devuelto — el llamador debe tratarlos como "—", no como cero.
 */
export async function getAttributionByWorkflow(): Promise<{
  byWorkflow: Map<string, WorkflowAttribution>
  global: GlobalAttribution
}> {
  const supabase = await createClient()

  const [{ count: totalMembers }, { data: runs }, { data: ledger }] =
    await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }),
      supabase.from("workflow_runs").select("id, workflow_id"),
      supabase
        .from("points_ledger")
        .select("member_id, workflow_run_id")
        .not("workflow_run_id", "is", null),
    ])

  if (!totalMembers || !ledger?.length) {
    return {
      byWorkflow: new Map(),
      global: {
        membersInJourney: null,
        averageConversion: null,
        attributedRevenue: null,
      },
    }
  }

  const workflowByRun = new Map((runs ?? []).map((r) => [r.id, r.workflow_id]))
  const membersByWorkflow = new Map<string, Set<string>>()
  const allMembers = new Set<string>()
  for (const row of ledger) {
    allMembers.add(row.member_id)
    const workflowId = workflowByRun.get(row.workflow_run_id!)
    if (!workflowId) continue
    if (!membersByWorkflow.has(workflowId)) {
      membersByWorkflow.set(workflowId, new Set())
    }
    membersByWorkflow.get(workflowId)!.add(row.member_id)
  }

  const { data: orders } = await supabase
    .from("pedidos")
    .select("member_id, total")
    .eq("estado", "completado")
    .in("member_id", [...allMembers])

  const revenueByMember = new Map<string, number>()
  for (const p of orders ?? []) {
    revenueByMember.set(
      p.member_id,
      (revenueByMember.get(p.member_id) ?? 0) + Number(p.total)
    )
  }

  const byWorkflow = new Map<string, WorkflowAttribution>()
  for (const [workflowId, members] of membersByWorkflow) {
    byWorkflow.set(workflowId, {
      inJourney: members.size,
      conversion: members.size / totalMembers,
      revenue: [...members].reduce(
        (acc, id) => acc + (revenueByMember.get(id) ?? 0),
        0
      ),
    })
  }

  const conversions = [...byWorkflow.values()].map((a) => a.conversion)

  return {
    byWorkflow,
    global: {
      membersInJourney: allMembers.size,
      averageConversion:
        conversions.reduce((a, b) => a + b, 0) / conversions.length,
      attributedRevenue: [...allMembers].reduce(
        (acc, id) => acc + (revenueByMember.get(id) ?? 0),
        0
      ),
    },
  }
}

export type ListWorkflowsParams = {
  page?: number
  pageSize?: number
  status?: WorkflowStatus
  q?: string
}

export type ListWorkflowsResult = {
  items: WorkflowListItem[]
  total: number
}

/**
 * RLS (`workflows_org`) ya limita el resultado a la organización del
 * usuario autenticado — no hace falta repetir el filtro por `org_id` aquí
 * (ver comentario de `org_scoped()` en la migración de RLS).
 */
export async function listWorkflows(
  params: ListWorkflowsParams = {}
): Promise<ListWorkflowsResult> {
  const { page = 1, pageSize = 25, status, q } = params
  const supabase = await createClient()

  // Solo columnas que existen en las DOS versiones del esquema; la vigencia
  // se resuelve después (ver `schema-compat.ts`). El listado se abre en la
  // pantalla de entrada del módulo, así que si esta consulta falla no se ve
  // ni la lista ni la forma de llegar al editor.
  const v2 = await hasV2Schema(supabase)
  let query = supabase
    .from("workflows")
    .select(
      `id, nombre, descripcion, estado, actualizado_en,
       author:profiles!actualizado_por(nombre), nodes:workflow_nodes(count)`,
      { count: "exact" }
    )
    .order("actualizado_en", { ascending: false })

  // El filtro llega con el vocabulario nuevo pero la columna puede seguir
  // guardando el viejo — filtrar por 'activa' contra una base sin migrar no
  // devolvería nada y parecería que no hay reglas publicadas.
  if (status) query = query.eq("estado", statusToDb(status, !v2))
  if (q) query = query.or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%`)

  const from = (page - 1) * pageSize
  const [{ data, count }, { byWorkflow: attribution }] = await Promise.all([
    query.range(from, from + pageSize - 1),
    getAttributionByWorkflow(),
  ])

  const lifecycleById = v2
    ? await getLifecycleByIds(
        supabase,
        (data ?? []).map((w) => w.id)
      )
    : new Map<string, typeof LIFECYCLE_FALLBACK>()

  return {
    items: (data ?? []).map((w) => {
      const attributionRow = attribution.get(w.id)
      return {
        id: w.id,
        nombre: w.nombre,
        descripcion: w.descripcion,
        estado: statusFromDb(w.estado),
        vigente_desde:
          lifecycleById.get(w.id)?.vigente_desde ??
          LIFECYCLE_FALLBACK.vigente_desde,
        vigente_hasta:
          lifecycleById.get(w.id)?.vigente_hasta ??
          LIFECYCLE_FALLBACK.vigente_hasta,
        prioridad:
          lifecycleById.get(w.id)?.prioridad ?? LIFECYCLE_FALLBACK.prioridad,
        exclusividad:
          lifecycleById.get(w.id)?.exclusividad ??
          LIFECYCLE_FALLBACK.exclusividad,
        actualizado_en: w.actualizado_en,
        authorName: w.author?.nombre ?? null,
        totalNodes: w.nodes?.[0]?.count ?? 0,
        inJourney: attributionRow?.inJourney ?? null,
        conversion: attributionRow?.conversion ?? null,
        revenue: attributionRow?.revenue ?? null,
      }
    }),
    total: count ?? 0,
  }
}

export type JourneysKpis = {
  active: number
  publishedThisWeek: number
  drafts: number
  /** Publicadas pero suspendidas (`inactiva`) — antes `pausado`, ver `WORKFLOW_STATUSES`. */
  paused: number
} & GlobalAttribution

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Los conteos por estado siempre son reales (derivados directo de
 * `workflows`). "Clientes en recorrido"/"Conversión media"/"Ingreso
 * atribuido" ahora también son reales cuando hay al menos un socio con un
 * `points_ledger` vinculado a una corrida (ver `getAttributionByWorkflow`)
 * — `null` cuando ningún workflow tiene evidencia todavía, y
 * `JourneysKpiRow` los muestra como "—" en ese caso, no como cero.
 */
export async function getJourneysKpis(): Promise<JourneysKpis> {
  const supabase = await createClient()
  const [{ data }, { global: attribution }] = await Promise.all([
    supabase.from("workflows").select("estado, actualizado_en"),
    getAttributionByWorkflow(),
  ])

  // `statusFromDb` y no una comparación directa: contra una base sin migrar
  // la columna sigue diciendo 'publicado'/'pausado', y comparar con los
  // valores nuevos daría cero reglas activas en todos los KPIs.
  const rows = (data ?? []).map((r) => ({
    estado: statusFromDb(r.estado),
    actualizado_en: r.actualizado_en,
  }))
  const now = Date.now()
  return {
    active: rows.filter((r) => r.estado === "activa").length,
    publishedThisWeek: rows.filter(
      (r) =>
        r.estado === "activa" &&
        now - new Date(r.actualizado_en).getTime() <= SEVEN_DAYS_MS
    ).length,
    drafts: rows.filter((r) => r.estado === "borrador").length,
    paused: rows.filter((r) => r.estado === "inactiva").length,
    ...attribution,
  }
}

export type WorkflowGraphNode = {
  id: string
  tipo: BuilderNodeType
  etiqueta: string
  posicion_x: number
  posicion_y: number
  config: Record<string, unknown>
}

export type WorkflowGraphEdge = {
  id: string
  source_node_id: string
  source_port: string
  target_node_id: string
}

export type WorkflowWithGraph = {
  id: string
  nombre: string
  estado: WorkflowStatus
  /** Cruzada con `estado = 'activa'` da el estado mostrado (`programada`/`finalizada`) — ver `lib/publication-status.ts`. */
  vigente_desde: string
  vigente_hasta: string | null
  /**
   * Prioridad y exclusividad son de la REGLA, no de un bloque: resuelven
   * qué pasa cuando dos reglas escuchan el mismo evento, y ningún nodo del
   * grafo puede contestar eso por separado.
   */
  prioridad: number
  exclusividad: WorkflowExclusivity
  grupo_exclusividad: string | null
  version_actual: number
  /**
   * `false` mientras las migraciones del ciclo de vida no estén aplicadas:
   * vigencia, prioridad y exclusividad se muestran con valores por defecto
   * y editarlas no persiste (ver `schema-compat.ts`). El editor lo avisa en
   * pantalla en vez de dejar que alguien los cambie y se pierdan sin ruido.
   */
  lifecyclePersisted: boolean
  actualizado_en: string
  authorName: string | null
  nodes: WorkflowGraphNode[]
  edges: WorkflowGraphEdge[]
}

export type WorkflowVersionSummary = {
  version: number
  creado_en: string
  authorName: string | null
}

export async function listWorkflowVersions(
  workflowId: string
): Promise<WorkflowVersionSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workflow_versions")
    .select("version, creado_en, author:profiles!autor_id(nombre)")
    .eq("workflow_id", workflowId)
    .order("version", { ascending: false })

  return (data ?? []).map((v) => ({
    version: v.version,
    creado_en: v.creado_en,
    authorName: v.author?.nombre ?? null,
  }))
}

export async function getWorkflowVersionGraph(
  workflowId: string,
  version: number
): Promise<{ nodes: WorkflowGraphNode[]; edges: WorkflowGraphEdge[] } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workflow_versions")
    .select("grafo")
    .eq("workflow_id", workflowId)
    .eq("version", version)
    .maybeSingle()

  if (!data) return null
  return data.grafo as unknown as {
    nodes: WorkflowGraphNode[]
    edges: WorkflowGraphEdge[]
  }
}

/** Las columnas que solo existen tras migrar — ver `schema-compat.ts`. */
async function getLifecycle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<typeof LIFECYCLE_FALLBACK> {
  const { data } = await supabase
    .from("workflows")
    .select(
      "vigente_desde, vigente_hasta, prioridad, exclusividad, grupo_exclusividad"
    )
    .eq("id", id)
    .maybeSingle()
  if (!data) return LIFECYCLE_FALLBACK
  return {
    vigente_desde: data.vigente_desde,
    vigente_hasta: data.vigente_hasta,
    prioridad: data.prioridad,
    exclusividad: data.exclusividad as WorkflowExclusivity,
    grupo_exclusividad: data.grupo_exclusividad,
  }
}

/** Misma idea que `getLifecycle`, para las filas de una página del listado. */
async function getLifecycleByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
): Promise<Map<string, typeof LIFECYCLE_FALLBACK>> {
  if (!ids.length) return new Map()
  const { data } = await supabase
    .from("workflows")
    .select(
      "id, vigente_desde, vigente_hasta, prioridad, exclusividad, grupo_exclusividad"
    )
    .in("id", ids)
  return new Map(
    (data ?? []).map((w) => [
      w.id,
      {
        vigente_desde: w.vigente_desde,
        vigente_hasta: w.vigente_hasta,
        prioridad: w.prioridad,
        exclusividad: w.exclusividad as WorkflowExclusivity,
        grupo_exclusividad: w.grupo_exclusividad,
      },
    ])
  )
}

/**
 * La regla que todavía no existe en la base. `/journeys/nuevo` monta el
 * editor sobre esto y el primer "Guardar" la crea de verdad
 * (`createWorkflowAction`) — abrir el canvas y salir no deja rastro.
 *
 * `id` vacío es la marca de "sin persistir": es lo que mira el editor para
 * decidir entre crear y actualizar, y lo que deshabilita Simular,
 * Historial y Analítica, que necesitan un `workflow_id` real.
 */
export async function newWorkflowDraft(): Promise<WorkflowWithGraph> {
  const supabase = await createClient()
  return {
    id: "",
    nombre: "Nueva regla",
    estado: "borrador",
    ...LIFECYCLE_FALLBACK,
    version_actual: 0,
    lifecyclePersisted: await hasV2Schema(supabase),
    actualizado_en: new Date().toISOString(),
    authorName: null,
    nodes: [],
    edges: [],
  }
}

export async function getWorkflowWithGraph(
  id: string
): Promise<WorkflowWithGraph | null> {
  const supabase = await createClient()

  // La consulta base pide solo columnas que existen en las DOS versiones del
  // esquema. Las del ciclo de vida van en una segunda consulta condicionada,
  // y no en un `select` ternario, porque el tipado de supabase-js analiza la
  // cadena del select en tiempo de compilación: un ternario ahí la vuelve un
  // `string` y se pierde el tipo de toda la fila.
  const v2 = await hasV2Schema(supabase)
  const { data: workflow, error } = await supabase
    .from("workflows")
    .select(
      `id, nombre, estado, version_actual, actualizado_en,
       author:profiles!actualizado_por(nombre)`
    )
    .eq("id", id)
    .maybeSingle()

  // Distinguir "no existe" de "la consulta falló" no es pedantería: sin
  // esto, cualquier error del esquema se disfraza de 404 y no queda nada en
  // los logs que apunte al problema real. `null` se reserva para el
  // workflow que de verdad no está.
  if (error) throw error
  if (!workflow) return null

  const lifecycle = v2 ? await getLifecycle(supabase, id) : LIFECYCLE_FALLBACK

  const [
    { data: nodes, error: nodesError },
    { data: edges, error: edgesError },
  ] = await Promise.all([
    supabase
      .from("workflow_nodes")
      .select("id, tipo, etiqueta, posicion_x, posicion_y, config")
      .eq("workflow_id", id),
    supabase
      .from("workflow_edges")
      .select("id, source_node_id, source_port, target_node_id")
      .eq("workflow_id", id),
  ])

  // Mismo criterio que arriba: un grafo que falla al cargarse no es un
  // grafo vacío. Sin esto, el editor abriría un canvas en blanco sobre una
  // regla que sí tiene bloques, y guardar encima los borraría.
  if (nodesError) throw nodesError
  if (edgesError) throw edgesError

  return {
    id: workflow.id,
    nombre: workflow.nombre,
    estado: statusFromDb(workflow.estado),
    vigente_desde: lifecycle.vigente_desde,
    vigente_hasta: lifecycle.vigente_hasta,
    prioridad: lifecycle.prioridad,
    exclusividad: lifecycle.exclusividad,
    grupo_exclusividad: lifecycle.grupo_exclusividad,
    version_actual: workflow.version_actual,
    /** `false` = la base todavía no tiene las columnas; el editor lo avisa. */
    lifecyclePersisted: v2,
    actualizado_en: workflow.actualizado_en,
    authorName: workflow.author?.nombre ?? null,
    // `nodeFromDb` deshace la codificación de los tipos que la base vieja
    // no acepta, y traduce los bloques de Entrada antiguos a `evento` — sin
    // eso el canvas recibiría un `tipo` que `BUILDER_BLOCKS` ya no conoce y
    // reventaría al pintar la tarjeta.
    nodes: (nodes ?? []).map((n) => {
      const { tipo, config } = nodeFromDb({
        tipo: n.tipo,
        config: (n.config as Record<string, unknown>) ?? {},
      })
      return {
        id: n.id,
        tipo,
        etiqueta: n.etiqueta,
        posicion_x: n.posicion_x,
        posicion_y: n.posicion_y,
        config,
      }
    }),
    edges: edges ?? [],
  }
}

export type WorkflowStatusEvent = {
  id: string
  estadoAnterior: string
  estadoNuevo: string
  motivo: StatusChangeReason
  nota: string | null
  actorName: string | null
  ocurridoEn: string
}

/**
 * Bitácora de cambios de estado de una regla. Es lo que hace auditable el
 * ciclo de vida: sin el motivo queda registrado QUÉ cambió pero no por qué,
 * que es justo lo que se busca al revisar por qué una regla dejó de aplicar.
 */
export async function listWorkflowStatusEvents(
  workflowId: string
): Promise<WorkflowStatusEvent[]> {
  const supabase = await createClient()
  // La tabla puede no existir todavía (migración sin aplicar): sin bitácora
  // se muestra vacía, que es exactamente lo que hay. Devolver [] en vez de
  // propagar el error mantiene el editor utilizable — perder el registro es
  // malo, no poder abrir la regla es peor.
  if (!(await hasStatusEventsTable(supabase))) return []

  const { data } = await supabase
    .from("workflow_status_events")
    .select(
      `id, estado_anterior, estado_nuevo, codigo_motivo, nota, ocurrido_en,
       actor:profiles!actor_id(nombre)`
    )
    .eq("workflow_id", workflowId)
    .order("ocurrido_en", { ascending: false })

  return (data ?? []).map((e) => ({
    id: e.id,
    estadoAnterior: e.estado_anterior,
    estadoNuevo: e.estado_nuevo,
    motivo: e.codigo_motivo as StatusChangeReason,
    nota: e.nota,
    actorName: e.actor?.nombre ?? null,
    ocurridoEn: e.ocurrido_en,
  }))
}

export type ActivityKind =
  "creada" | "estado" | "version" | "simulacion" | "publicacion"

export type WorkflowActivityEntry = {
  id: string
  kind: ActivityKind
  /** Qué pasó, en una línea. */
  titulo: string
  /** El porqué o el detalle — motivo del cambio, cohorte simulada, nota de la versión. */
  detalle: string | null
  actorName: string | null
  ocurridoEn: string
}

/**
 * Todo lo que le ha pasado a una regla, en una sola línea de tiempo.
 *
 * Por qué junta cuatro tablas: la pregunta que se hace alguien al abrir una
 * regla que no reconoce no es «¿qué cambios de estado tuvo?» sino «¿qué ha
 * pasado aquí?», y la respuesta está repartida —cuándo se creó
 * (`workflows`), qué versiones se publicaron (`workflow_versions`), cuándo
 * se simuló y con cuánta gente (`workflow_runs`) y por qué cambió de estado
 * (`workflow_status_events`)—. Cada tabla por separado cuenta un trozo; el
 * orden cronológico entre todas es lo que cuenta la historia.
 *
 * Tolera que `workflow_status_events` no exista todavía (migración sin
 * aplicar, ver `schema-compat.ts`): en ese caso la línea de tiempo se arma
 * con las otras tres en vez de quedarse vacía.
 */
export async function listWorkflowActivity(
  workflowId: string
): Promise<WorkflowActivityEntry[]> {
  const supabase = await createClient()
  const hasEvents = await hasStatusEventsTable(supabase)

  const [workflow, versions, runs, statusEvents] = await Promise.all([
    supabase
      .from("workflows")
      .select("creado_en, author:profiles!creado_por(nombre)")
      .eq("id", workflowId)
      .maybeSingle(),
    supabase
      .from("workflow_versions")
      .select("id, version, nota, creado_en, author:profiles!autor_id(nombre)")
      .eq("workflow_id", workflowId),
    supabase
      .from("workflow_runs")
      .select("id, tipo, estado, resumen, workflow_version, iniciado_en")
      .eq("workflow_id", workflowId),
    hasEvents
      ? supabase
          .from("workflow_status_events")
          .select(
            `id, estado_anterior, estado_nuevo, codigo_motivo, nota,
             ocurrido_en, actor:profiles!actor_id(nombre)`
          )
          .eq("workflow_id", workflowId)
      : Promise.resolve({ data: [] as never[] }),
  ])

  const entries: WorkflowActivityEntry[] = []

  if (workflow.data) {
    entries.push({
      id: `creada-${workflowId}`,
      kind: "creada",
      titulo: "Regla creada",
      detalle: null,
      actorName: workflow.data.author?.nombre ?? null,
      ocurridoEn: workflow.data.creado_en,
    })
  }

  for (const v of versions.data ?? []) {
    entries.push({
      id: `version-${v.id}`,
      kind: "version",
      titulo: `Versión ${String(v.version)} guardada`,
      detalle: v.nota,
      actorName: v.author?.nombre ?? null,
      ocurridoEn: v.creado_en,
    })
  }

  for (const run of runs.data ?? []) {
    const resumen = run.resumen as { initialCohort?: number } | null
    const cohorte = resumen?.initialCohort
    entries.push({
      id: `run-${run.id}`,
      kind: run.tipo === "publicacion" ? "publicacion" : "simulacion",
      titulo:
        run.tipo === "publicacion"
          ? `Publicada · versión ${String(run.workflow_version)}`
          : "Simulación ejecutada",
      detalle: cohorte
        ? `Cohorte de ${formatNumber(cohorte)} socios · ${run.estado}`
        : run.estado,
      actorName: null,
      ocurridoEn: run.iniciado_en,
    })
  }

  for (const e of statusEvents.data ?? []) {
    entries.push({
      id: `estado-${e.id}`,
      kind: "estado",
      titulo: `${statusFromDb(e.estado_anterior)} → ${statusFromDb(e.estado_nuevo)}`,
      detalle: [
        STATUS_CHANGE_REASON_LABEL[
          e.codigo_motivo as StatusChangeReason
        ]?.replace(" (especificar)", ""),
        e.nota,
      ]
        .filter(Boolean)
        .join(" — "),
      actorName: e.actor?.nombre ?? null,
      ocurridoEn: e.ocurrido_en,
    })
  }

  // Más reciente primero: lo que acaba de pasar es lo que se está mirando.
  return entries.sort(
    (a, b) =>
      new Date(b.ocurridoEn).getTime() - new Date(a.ocurridoEn).getTime()
  )
}
