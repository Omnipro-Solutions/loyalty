import { createClient } from "@/lib/supabase/server"
import type { BuilderNodeType, TierName, WorkflowStatus } from "@/types/domain"

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

export type WorkflowListItem = {
  id: string
  nombre: string
  descripcion: string | null
  estado: WorkflowStatus
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

  let query = supabase
    .from("workflows")
    .select(
      "id, nombre, descripcion, estado, actualizado_en, author:profiles!actualizado_por(nombre), nodes:workflow_nodes(count)",
      { count: "exact" }
    )
    .order("actualizado_en", { ascending: false })

  if (status) query = query.eq("estado", status)
  if (q) query = query.or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%`)

  const from = (page - 1) * pageSize
  const [{ data, count }, { byWorkflow: attribution }] = await Promise.all([
    query.range(from, from + pageSize - 1),
    getAttributionByWorkflow(),
  ])

  return {
    items: (data ?? []).map((w) => {
      const attributionRow = attribution.get(w.id)
      return {
        id: w.id,
        nombre: w.nombre,
        descripcion: w.descripcion,
        estado: w.estado as WorkflowStatus,
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

  const rows = data ?? []
  const now = Date.now()
  return {
    active: rows.filter((r) => r.estado === "publicado").length,
    publishedThisWeek: rows.filter(
      (r) =>
        r.estado === "publicado" &&
        now - new Date(r.actualizado_en).getTime() <= SEVEN_DAYS_MS
    ).length,
    drafts: rows.filter((r) => r.estado === "borrador").length,
    paused: rows.filter((r) => r.estado === "pausado").length,
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

export async function getWorkflowWithGraph(
  id: string
): Promise<WorkflowWithGraph | null> {
  const supabase = await createClient()

  const { data: workflow } = await supabase
    .from("workflows")
    .select(
      "id, nombre, estado, actualizado_en, author:profiles!actualizado_por(nombre)"
    )
    .eq("id", id)
    .maybeSingle()

  if (!workflow) return null

  const [{ data: nodes }, { data: edges }] = await Promise.all([
    supabase
      .from("workflow_nodes")
      .select("id, tipo, etiqueta, posicion_x, posicion_y, config")
      .eq("workflow_id", id),
    supabase
      .from("workflow_edges")
      .select("id, source_node_id, source_port, target_node_id")
      .eq("workflow_id", id),
  ])

  return {
    id: workflow.id,
    nombre: workflow.nombre,
    estado: workflow.estado as WorkflowStatus,
    actualizado_en: workflow.actualizado_en,
    authorName: workflow.author?.nombre ?? null,
    nodes: (nodes ?? []).map((n) => ({
      id: n.id,
      tipo: n.tipo as BuilderNodeType,
      etiqueta: n.etiqueta,
      posicion_x: n.posicion_x,
      posicion_y: n.posicion_y,
      config: (n.config as Record<string, unknown>) ?? {},
    })),
    edges: edges ?? [],
  }
}
