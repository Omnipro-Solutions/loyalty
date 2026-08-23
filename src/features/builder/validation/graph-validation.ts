import {
  BUILDER_ENTRY_NODE_TYPES,
  BUILDER_LOGIC_NODE_TYPES,
  type BuilderNodeType,
} from "@/types/domain"

export type GraphNode = { id: string; tipo: BuilderNodeType }
export type GraphEdge = {
  source_node_id: string
  source_port: string
  target_node_id: string
}

export type ValidationIssue = {
  level: "error" | "advertencia"
  message: string
  nodeId?: string
}

const ENTRY_TYPES = new Set<string>(BUILDER_ENTRY_NODE_TYPES)
const LOGIC_TYPES = new Set<string>(BUILDER_LOGIC_NODE_TYPES)

/**
 * Puertos de salida esperados por tipo — coincide con `OUTPUT_HANDLES` de
 * `canvas/builder-node.tsx` para los fijos; los de rama dinámica
 * (`ramificacion_valor`/`split_ab`) se resuelven desde `config.ramas` de
 * cada nodo, así que esta función recibe el grafo ya con esa info.
 */
function expectedPorts(node: GraphNode, config: Record<string, unknown>) {
  if (node.tipo === "condicion_multiple") return ["cumple", "no_cumple"]
  if (node.tipo === "acumular_puntos") return ["out", "tope_alcanzado"]
  if (node.tipo === "fin_workflow") return []
  if (node.tipo === "ramificacion_valor" || node.tipo === "split_ab") {
    const branches = config.ramas
    if (Array.isArray(branches) && branches.length > 0) {
      return branches
        .map((r) =>
          r && typeof r === "object" ? (r as { id?: string }).id : undefined
        )
        .filter((id): id is string => typeof id === "string")
    }
    return ["rama_1", "por_defecto"]
  }
  return ["out"]
}

/**
 * Valida el grafo completo del canvas: entrada única activa, ciclos (DFS),
 * y puertos de ramificación sin conectar. Corre 100% en el cliente sobre
 * el estado actual de xyflow — no necesita ida y vuelta al servidor.
 *
 * "Bloqueante" (nivel `error`, impide Publicar) vs. "advertencia": solo
 * los problemas que dejarían el workflow en un estado incoherente al
 * ejecutarlo de verdad (sin entrada, más de una entrada, o un ciclo) son
 * bloqueantes. Una rama sin conectar es válida en un borrador a medio
 * construir — se avisa, pero no bloquea Publicar (decisión de producto:
 * forzar cada rama conectada antes de poder guardar sería demasiado
 * fricción para iterar).
 */
export function validateGraph(
  nodes: (GraphNode & { config: Record<string, unknown> })[],
  edges: GraphEdge[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const entryNodes = nodes.filter((n) => ENTRY_TYPES.has(n.tipo))
  if (entryNodes.length === 0) {
    issues.push({
      level: "error",
      message: "El workflow no tiene ningún bloque de entrada.",
    })
  } else if (entryNodes.length > 1) {
    issues.push({
      level: "error",
      message:
        "Solo puede haber una entrada activa por workflow — hay " +
        String(entryNodes.length) +
        ".",
    })
  }

  for (const node of nodes) {
    const expected = expectedPorts(node, node.config)
    if (expected.length <= 1) continue
    const connected = new Set(
      edges
        .filter((e) => e.source_node_id === node.id)
        .map((e) => e.source_port)
    )
    const unconnected = expected.filter((p) => !connected.has(p))
    if (unconnected.length) {
      issues.push({
        level: "advertencia",
        nodeId: node.id,
        message: `"${node.tipo}" tiene ${String(unconnected.length)} rama(s) sin conectar.`,
      })
    }
  }

  const cycleFound = detectCycle(nodes, edges)
  if (cycleFound) {
    issues.push({
      level: "error",
      message:
        "El grafo tiene un ciclo — un nodo termina llevando de vuelta a un bloque anterior.",
    })
  }

  return issues
}

function detectCycle(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  const adjacency = new Map<string, string[]>()
  for (const n of nodes) adjacency.set(n.id, [])
  for (const e of edges) {
    adjacency.get(e.source_node_id)?.push(e.target_node_id)
  }

  const VISITING = 1
  const VISITED = 2
  const visitState = new Map<string, number>()

  function dfs(id: string): boolean {
    visitState.set(id, VISITING)
    for (const neighbor of adjacency.get(id) ?? []) {
      const s = visitState.get(neighbor)
      if (s === VISITING) return true
      if (s !== VISITED && dfs(neighbor)) return true
    }
    visitState.set(id, VISITED)
    return false
  }

  for (const n of nodes) {
    if (!visitState.has(n.id) && dfs(n.id)) return true
  }
  return false
}

export function isLogicNode(tipo: BuilderNodeType) {
  return LOGIC_TYPES.has(tipo)
}
