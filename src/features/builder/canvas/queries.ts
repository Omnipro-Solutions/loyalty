import { createClient } from "@/lib/supabase/server"
import type { BuilderNodeType, TierName, WorkflowStatus } from "@/types/domain"

export type TierResumen = { nombre: TierName; multiplicador: number }

/** Multiplicadores reales por nivel — alimenta la vista previa en vivo de `acumular_puntos`. */
export async function listTiers(): Promise<TierResumen[]> {
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

export type WorkflowListItem = {
  id: string
  nombre: string
  descripcion: string | null
  estado: WorkflowStatus
  actualizado_en: string
  autorNombre: string | null
  totalNodos: number
  /** `null` = sin evidencia real todavía (ningún socio con un `points_ledger` vinculado a una corrida de este workflow) — se muestra "—", no un placeholder inventado. Ver `getAtribucionPorWorkflow`. */
  enRecorrido: number | null
  conversion: number | null
  ingreso: number | null
}

export type AtribucionWorkflow = {
  enRecorrido: number
  conversion: number
  ingreso: number
}

export type AtribucionGlobal = {
  clientesEnRecorrido: number | null
  conversionMedia: number | null
  ingresoAtribuido: number | null
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
export async function getAtribucionPorWorkflow(): Promise<{
  porWorkflow: Map<string, AtribucionWorkflow>
  global: AtribucionGlobal
}> {
  const supabase = await createClient()

  const [{ count: totalMiembros }, { data: runs }, { data: ledger }] =
    await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }),
      supabase.from("workflow_runs").select("id, workflow_id"),
      supabase
        .from("points_ledger")
        .select("member_id, workflow_run_id")
        .not("workflow_run_id", "is", null),
    ])

  if (!totalMiembros || !ledger?.length) {
    return {
      porWorkflow: new Map(),
      global: {
        clientesEnRecorrido: null,
        conversionMedia: null,
        ingresoAtribuido: null,
      },
    }
  }

  const workflowPorRun = new Map((runs ?? []).map((r) => [r.id, r.workflow_id]))
  const miembrosPorWorkflow = new Map<string, Set<string>>()
  const todosLosMiembros = new Set<string>()
  for (const fila of ledger) {
    todosLosMiembros.add(fila.member_id)
    const workflowId = workflowPorRun.get(fila.workflow_run_id!)
    if (!workflowId) continue
    if (!miembrosPorWorkflow.has(workflowId)) {
      miembrosPorWorkflow.set(workflowId, new Set())
    }
    miembrosPorWorkflow.get(workflowId)!.add(fila.member_id)
  }

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("member_id, total")
    .eq("estado", "completado")
    .in("member_id", [...todosLosMiembros])

  const ingresoPorMiembro = new Map<string, number>()
  for (const p of pedidos ?? []) {
    ingresoPorMiembro.set(
      p.member_id,
      (ingresoPorMiembro.get(p.member_id) ?? 0) + Number(p.total)
    )
  }

  const porWorkflow = new Map<string, AtribucionWorkflow>()
  for (const [workflowId, miembros] of miembrosPorWorkflow) {
    porWorkflow.set(workflowId, {
      enRecorrido: miembros.size,
      conversion: miembros.size / totalMiembros,
      ingreso: [...miembros].reduce(
        (acc, id) => acc + (ingresoPorMiembro.get(id) ?? 0),
        0
      ),
    })
  }

  const conversiones = [...porWorkflow.values()].map((a) => a.conversion)

  return {
    porWorkflow,
    global: {
      clientesEnRecorrido: todosLosMiembros.size,
      conversionMedia:
        conversiones.reduce((a, b) => a + b, 0) / conversiones.length,
      ingresoAtribuido: [...todosLosMiembros].reduce(
        (acc, id) => acc + (ingresoPorMiembro.get(id) ?? 0),
        0
      ),
    },
  }
}

export type ListWorkflowsParams = {
  page?: number
  pageSize?: number
  estado?: WorkflowStatus
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
  const { page = 1, pageSize = 25, estado, q } = params
  const supabase = await createClient()

  let query = supabase
    .from("workflows")
    .select(
      "id, nombre, descripcion, estado, actualizado_en, autor:profiles!actualizado_por(nombre), nodos:workflow_nodes(count)",
      { count: "exact" }
    )
    .order("actualizado_en", { ascending: false })

  if (estado) query = query.eq("estado", estado)
  if (q) query = query.or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%`)

  const desde = (page - 1) * pageSize
  const [{ data, count }, { porWorkflow: atribucion }] = await Promise.all([
    query.range(desde, desde + pageSize - 1),
    getAtribucionPorWorkflow(),
  ])

  return {
    items: (data ?? []).map((w) => {
      const atribucionFila = atribucion.get(w.id)
      return {
        id: w.id,
        nombre: w.nombre,
        descripcion: w.descripcion,
        estado: w.estado as WorkflowStatus,
        actualizado_en: w.actualizado_en,
        autorNombre: w.autor?.nombre ?? null,
        totalNodos: w.nodos?.[0]?.count ?? 0,
        enRecorrido: atribucionFila?.enRecorrido ?? null,
        conversion: atribucionFila?.conversion ?? null,
        ingreso: atribucionFila?.ingreso ?? null,
      }
    }),
    total: count ?? 0,
  }
}

export type JourneysKpis = {
  activos: number
  publicadosEstaSemana: number
  borradores: number
  pausados: number
} & AtribucionGlobal

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Los conteos por estado siempre son reales (derivados directo de
 * `workflows`). "Clientes en recorrido"/"Conversión media"/"Ingreso
 * atribuido" ahora también son reales cuando hay al menos un socio con un
 * `points_ledger` vinculado a una corrida (ver `getAtribucionPorWorkflow`)
 * — `null` cuando ningún workflow tiene evidencia todavía, y
 * `JourneysKpiRow` los muestra como "—" en ese caso, no como cero.
 */
export async function getJourneysKpis(): Promise<JourneysKpis> {
  const supabase = await createClient()
  const [{ data }, { global: atribucion }] = await Promise.all([
    supabase.from("workflows").select("estado, actualizado_en"),
    getAtribucionPorWorkflow(),
  ])

  const rows = data ?? []
  const ahora = Date.now()
  return {
    activos: rows.filter((r) => r.estado === "publicado").length,
    publicadosEstaSemana: rows.filter(
      (r) =>
        r.estado === "publicado" &&
        ahora - new Date(r.actualizado_en).getTime() <= SIETE_DIAS_MS
    ).length,
    borradores: rows.filter((r) => r.estado === "borrador").length,
    pausados: rows.filter((r) => r.estado === "pausado").length,
    ...atribucion,
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
  autorNombre: string | null
  nodes: WorkflowGraphNode[]
  edges: WorkflowGraphEdge[]
}

export type WorkflowVersionSummary = {
  version: number
  creado_en: string
  autorNombre: string | null
}

export async function listWorkflowVersions(
  workflowId: string
): Promise<WorkflowVersionSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workflow_versions")
    .select("version, creado_en, autor:profiles!autor_id(nombre)")
    .eq("workflow_id", workflowId)
    .order("version", { ascending: false })

  return (data ?? []).map((v) => ({
    version: v.version,
    creado_en: v.creado_en,
    autorNombre: v.autor?.nombre ?? null,
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
      "id, nombre, estado, actualizado_en, autor:profiles!actualizado_por(nombre)"
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
    autorNombre: workflow.autor?.nombre ?? null,
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
