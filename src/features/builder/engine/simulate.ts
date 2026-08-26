import { BUILDER_ENTRY_NODE_TYPES, type BuilderNodeType } from "@/types/domain"

export type SimNode = {
  id: string
  tipo: BuilderNodeType
  config: Record<string, unknown>
}
export type SimEdge = {
  source_node_id: string
  source_port: string
  target_node_id: string
}

export type SimStep = {
  nodeId: string
  tipo: BuilderNodeType
  entryCount: number
  outputs: { port: string; count: number }[]
}

const ENTRY_TYPES = new Set<string>(BUILDER_ENTRY_NODE_TYPES)

function configNumber(
  config: Record<string, unknown>,
  key: string,
  defaultValue: number
): number {
  const v = config[key]
  return typeof v === "number" && Number.isFinite(v) ? v : defaultValue
}

/**
 * Distribuye `entrada` personas entre los puertos de salida de un nodo,
 * según su tipo. Esto es una aproximación de producto (no hay datos reales
 * de miembros evaluándose contra condiciones todavía — ese es un motor de
 * evaluación real, fuera de alcance de un simulador de vista previa) pero
 * determinística y testeable: mismos parámetros, mismo resultado siempre.
 */
function distribute(
  node: SimNode,
  entrada: number
): { port: string; count: number }[] {
  if (entrada <= 0) return []

  if (node.tipo === "condicion_multiple") {
    const matchPct = Math.min(
      100,
      Math.max(0, configNumber(node.config, "porcentaje_cumple_estimado", 60))
    )
    const matchCount = Math.round((entrada * matchPct) / 100)
    return [
      { port: "cumple", count: matchCount },
      { port: "no_cumple", count: entrada - matchCount },
    ]
  }

  if (node.tipo === "ramificacion_valor" || node.tipo === "split_ab") {
    const branches = Array.isArray(node.config.branches)
      ? (node.config.branches as { id: string; weight?: number }[])
      : [{ id: "rama_1" }, { id: "por_defecto" }]
    const weights = branches.map((r) =>
      typeof r.weight === "number" && r.weight > 0 ? r.weight : 1
    )
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let remaining = entrada
    const outputs = branches.map((r, i) => {
      const isLast = i === branches.length - 1
      const count = isLast
        ? remaining
        : Math.round((entrada * weights[i]) / totalWeight)
      remaining -= count
      return { port: r.id, count }
    })
    return outputs
  }

  if (node.tipo === "acumular_puntos") {
    const capPct = Math.min(
      100,
      Math.max(0, configNumber(node.config, "tasa_tope_estimada", 8))
    )
    // Tercer puerto tipado (ZERO_POINTS, docs/builder.md §16) — misma
    // estimación "razonable por defecto, no configurable en el inspector"
    // que ya usa `tasa_tope_estimada`. Acotado a lo que le queda a
    // `capPct` para que los 3 puertos nunca sumen más del 100% de la
    // cohorte.
    const zeroPct = Math.min(
      100 - capPct,
      Math.max(0, configNumber(node.config, "tasa_sin_puntos_estimada", 3))
    )
    const cap = Math.round((entrada * capPct) / 100)
    const zero = Math.round((entrada * zeroPct) / 100)
    return [
      { port: "out", count: entrada - cap - zero },
      { port: "tope_alcanzado", count: cap },
      { port: "sin_puntos", count: zero },
    ]
  }

  if (node.tipo === "fin_workflow") return []

  return [{ port: "out", count: entrada }]
}

/**
 * Recorre el grafo desde el/los bloque(s) de entrada con una cohorte
 * inicial y produce los conteos de entrada/salida por nodo — el mismo
 * patrón de "1.514 → 1.402 → 1.088" del Figma. Puro, sin I/O: recibe el
 * grafo ya cargado y devuelve los pasos; persistirlo en
 * `workflow_runs`/`workflow_run_steps` es responsabilidad de quien llama.
 *
 * Ciclos: si el grafo tiene uno (no debería pasar un workflow publicado,
 * pero un borrador a medio construir sí puede), cada nodo se procesa como
 * máximo una vez — la segunda vez que le llegaría cohorte, se ignora, para
 * que el simulador nunca entre en un loop infinito.
 */
export function simulateWorkflow(
  nodes: SimNode[],
  edges: SimEdge[],
  initialCohort: number
): SimStep[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const outgoingByNode = new Map<string, SimEdge[]>()
  for (const e of edges) {
    const list = outgoingByNode.get(e.source_node_id) ?? []
    list.push(e)
    outgoingByNode.set(e.source_node_id, list)
  }

  const accumulatedInputByNode = new Map<string, number>()
  const processed = new Set<string>()
  const steps: SimStep[] = []

  const entryNodes = nodes.filter((n) => ENTRY_TYPES.has(n.tipo))
  const queue: string[] = []
  for (const n of entryNodes) {
    accumulatedInputByNode.set(n.id, initialCohort)
    queue.push(n.id)
  }

  while (queue.length) {
    const id = queue.shift()!
    if (processed.has(id)) continue
    processed.add(id)

    const node = byId.get(id)
    if (!node) continue

    const entryCount = accumulatedInputByNode.get(id) ?? 0
    const outputs = distribute(node, entryCount)
    steps.push({ nodeId: id, tipo: node.tipo, entryCount, outputs })

    for (const output of outputs) {
      if (output.count <= 0) continue
      const edgesForThisPort = (outgoingByNode.get(id) ?? []).filter(
        (e) => e.source_port === output.port
      )
      for (const edge of edgesForThisPort) {
        const previous = accumulatedInputByNode.get(edge.target_node_id) ?? 0
        accumulatedInputByNode.set(edge.target_node_id, previous + output.count)
        if (!processed.has(edge.target_node_id)) {
          queue.push(edge.target_node_id)
        }
      }
    }
  }

  return steps
}
