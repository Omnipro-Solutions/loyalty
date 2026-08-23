import {
  BUILDER_ENTRY_NODE_TIPOS,
  BUILDER_LOGIC_NODE_TIPOS,
  type BuilderNodeTipo,
} from "@/types/domain"

export type GraphNode = { id: string; tipo: BuilderNodeTipo }
export type GraphEdge = {
  source_node_id: string
  source_port: string
  target_node_id: string
}

export type ValidationIssue = {
  nivel: "error" | "advertencia"
  mensaje: string
  nodeId?: string
}

const ENTRY_TIPOS = new Set<string>(BUILDER_ENTRY_NODE_TIPOS)
const LOGIC_TIPOS = new Set<string>(BUILDER_LOGIC_NODE_TIPOS)

/**
 * Puertos de salida esperados por tipo — coincide con `OUTPUT_HANDLES` de
 * `canvas/builder-node.tsx` para los fijos; los de rama dinámica
 * (`ramificacion_valor`/`split_ab`) se resuelven desde `config.ramas` de
 * cada nodo, así que esta función recibe el grafo ya con esa info.
 */
function puertosEsperados(node: GraphNode, config: Record<string, unknown>) {
  if (node.tipo === "condicion_multiple") return ["cumple", "no_cumple"]
  if (node.tipo === "acumular_puntos") return ["out", "tope_alcanzado"]
  if (node.tipo === "fin_workflow") return []
  if (node.tipo === "ramificacion_valor" || node.tipo === "split_ab") {
    const ramas = config.ramas
    if (Array.isArray(ramas) && ramas.length > 0) {
      return ramas
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
export function validarGrafo(
  nodes: (GraphNode & { config: Record<string, unknown> })[],
  edges: GraphEdge[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const entradas = nodes.filter((n) => ENTRY_TIPOS.has(n.tipo))
  if (entradas.length === 0) {
    issues.push({
      nivel: "error",
      mensaje: "El workflow no tiene ningún bloque de entrada.",
    })
  } else if (entradas.length > 1) {
    issues.push({
      nivel: "error",
      mensaje:
        "Solo puede haber una entrada activa por workflow — hay " +
        String(entradas.length) +
        ".",
    })
  }

  for (const node of nodes) {
    const esperados = puertosEsperados(node, node.config)
    if (esperados.length <= 1) continue
    const conectados = new Set(
      edges
        .filter((e) => e.source_node_id === node.id)
        .map((e) => e.source_port)
    )
    const sinConectar = esperados.filter((p) => !conectados.has(p))
    if (sinConectar.length) {
      issues.push({
        nivel: "advertencia",
        nodeId: node.id,
        mensaje: `"${node.tipo}" tiene ${String(sinConectar.length)} rama(s) sin conectar.`,
      })
    }
  }

  const cicloEncontrado = detectarCiclo(nodes, edges)
  if (cicloEncontrado) {
    issues.push({
      nivel: "error",
      mensaje:
        "El grafo tiene un ciclo — un nodo termina llevando de vuelta a un bloque anterior.",
    })
  }

  return issues
}

function detectarCiclo(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  const adyacencia = new Map<string, string[]>()
  for (const n of nodes) adyacencia.set(n.id, [])
  for (const e of edges) {
    adyacencia.get(e.source_node_id)?.push(e.target_node_id)
  }

  const VISITANDO = 1
  const VISITADO = 2
  const estado = new Map<string, number>()

  function dfs(id: string): boolean {
    estado.set(id, VISITANDO)
    for (const vecino of adyacencia.get(id) ?? []) {
      const s = estado.get(vecino)
      if (s === VISITANDO) return true
      if (s !== VISITADO && dfs(vecino)) return true
    }
    estado.set(id, VISITADO)
    return false
  }

  for (const n of nodes) {
    if (!estado.has(n.id) && dfs(n.id)) return true
  }
  return false
}

export function esNodoDeLogica(tipo: BuilderNodeTipo) {
  return LOGIC_TIPOS.has(tipo)
}
