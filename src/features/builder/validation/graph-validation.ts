import { BUILDER_BLOCKS } from "@/config/builder-blocks"
import { outputPortIdsFor } from "@/config/builder-ports"
import { isMessageNodeType } from "@/config/integration-flows"
import {
  BUILDER_ENTRY_NODE_TYPES,
  BUILDER_LOGIC_NODE_TYPES,
  type BuilderNodeType,
} from "@/types/domain"

import { validateNodeConfig } from "../inspector/schemas"

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
 * Puertos de salida esperados por tipo.
 *
 * Antes esta función repetía a mano la tabla de `OUTPUT_HANDLES` con un
 * comentario en cada sitio pidiendo que coincidieran. Ahora las dos derivan
 * de `config/builder-ports.ts`: lo que se pinta y lo que se valida no pueden
 * divergir. Las ramas dinámicas (`ramificacion_valor`/`split_ab`) siguen
 * resolviéndose desde `config.branches`, que el resolver ya contempla.
 */
function expectedPorts(node: GraphNode, config: Record<string, unknown>) {
  return outputPortIdsFor(node.tipo, config)
}

/**
 * Valida el grafo completo del canvas: entrada única activa, ciclos (DFS),
 * y puertos de ramificación sin conectar. Corre 100% en el cliente sobre
 * el estado actual de xyflow — no necesita ida y vuelta al servidor.
 *
 * "Bloqueante" (nivel `error`, impide Publicar) vs. "advertencia": solo
 * los problemas que dejarían el workflow en un estado incoherente al
 * ejecutarlo de verdad (sin entrada, más de una entrada, un ciclo, o un
 * nodo con campos obligatorios sin completar — ver `validateNodeConfig`)
 * son bloqueantes. Una rama sin conectar es válida en un borrador a medio
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
    if (
      isMessageNodeType(node.tipo) &&
      typeof node.config.flujo_id !== "string"
    ) {
      issues.push({
        level: "advertencia",
        nodeId: node.id,
        message: `"${node.tipo}" todavía no tiene un flujo de integración elegido.`,
      })
    }

    const missingFields = validateNodeConfig(node.tipo, node.config)
    if (missingFields.length) {
      issues.push({
        level: "error",
        nodeId: node.id,
        message: `"${BUILDER_BLOCKS[node.tipo].label}" tiene campos obligatorios sin completar: ${missingFields.join(", ")}.`,
      })
    }

    // Una ramificación enruta por la condición de cada rama, no por peso
    // (ver `BranchesTab`): una rama sin condición no es "la que sobra", es
    // una rama que el motor no sabría cuándo tomar. `por_defecto` es la
    // excepción por definición — es justo la que se toma cuando ninguna
    // otra se cumple.
    if (node.tipo === "ramificacion_valor") {
      const sinCondicion = branchesOf(node.config).filter(
        (b) => b.id !== "por_defecto" && !hasCondition(b)
      )
      if (sinCondicion.length) {
        issues.push({
          level: "error",
          nodeId: node.id,
          message: `"${BUILDER_BLOCKS[node.tipo].label}" tiene ${String(sinCondicion.length)} rama(s) sin condición: ${sinCondicion.map((b) => b.label).join(", ")}.`,
        })
      }
    }

    // Una unión con una sola entrada no une nada — no rompe la ejecución,
    // pero casi siempre significa que faltó conectar la otra rama.
    if (node.tipo === "union") {
      const incoming = edges.filter((e) => e.target_node_id === node.id).length
      if (incoming < 2) {
        issues.push({
          level: "advertencia",
          nodeId: node.id,
          message: `"Unión" tiene ${String(incoming)} rama(s) entrante(s): con menos de 2 no reanuda nada.`,
        })
      }
    }

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

type BranchRef = { id: string; label: string; condition?: unknown }

function branchesOf(config: Record<string, unknown>): BranchRef[] {
  const branches = config.branches
  if (!Array.isArray(branches)) return []
  return branches.filter(
    (b): b is BranchRef =>
      !!b &&
      typeof b === "object" &&
      typeof (b as { id?: unknown }).id === "string" &&
      typeof (b as { label?: unknown }).label === "string"
  )
}

/** Una rama con un grupo vacío tampoco enruta: `rules: []` se cumple siempre. */
function hasCondition(branch: BranchRef): boolean {
  const condition = branch.condition as { rules?: unknown } | undefined
  return Array.isArray(condition?.rules) && condition.rules.length > 0
}

export function isLogicNode(tipo: BuilderNodeType) {
  return LOGIC_TYPES.has(tipo)
}
