export type NodePosition = { x: number; y: number }

export const COLUMN_WIDTH = 340
export const ROW_HEIGHT = 220

type EdgeRef = {
  source_node_id: string
  source_port: string | null
  target_node_id: string
}

/**
 * Layout en capas top-a-abajo (Figma "08.3 · analítica", 681:2133): cada
 * nodo va a la profundidad más larga desde cualquier raíz (así un nodo que
 * reconverge desde dos ramas queda SIEMPRE debajo de ambas, nunca a mitad
 * de una), y dentro de cada capa las columnas se centran respecto a la capa
 * más ancha del grafo. No es un layout Sugiyama de propósito general — para
 * los grafos reales de este builder (ramificaciones de 2-3 vías que
 * reconvergen) es suficiente y evita traer una librería de layout solo para
 * este caso.
 */
export function calculateVerticalLayout(
  nodeIds: string[],
  edges: EdgeRef[]
): Map<string, NodePosition> {
  const outgoing = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  for (const id of nodeIds) inDegree.set(id, 0)
  for (const e of edges) {
    if (!outgoing.has(e.source_node_id)) outgoing.set(e.source_node_id, [])
    outgoing.get(e.source_node_id)!.push(e.target_node_id)
    inDegree.set(e.target_node_id, (inDegree.get(e.target_node_id) ?? 0) + 1)
  }

  const depth = new Map<string, number>()
  const visitOrder = new Map<string, number>()
  let visitCounter = 0
  const remaining = new Map(inDegree)
  const queue = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0)
  queue.forEach((id) => depth.set(id, 0))

  while (queue.length) {
    const id = queue.shift()!
    if (!visitOrder.has(id)) visitOrder.set(id, visitCounter++)
    for (const target of outgoing.get(id) ?? []) {
      depth.set(
        target,
        Math.max(depth.get(target) ?? 0, (depth.get(id) ?? 0) + 1)
      )
      remaining.set(target, (remaining.get(target) ?? 0) - 1)
      if (remaining.get(target) === 0) queue.push(target)
    }
  }
  // Nodos inalcanzables desde ninguna raíz (grafo desconectado — no debería
  // ocurrir en un grafo que pasó `validateGraph`) van a la capa 0 al final,
  // para que el layout no se rompa en vez de fallar silenciosamente.
  for (const id of nodeIds) {
    if (!depth.has(id)) {
      depth.set(id, 0)
      visitOrder.set(id, visitCounter++)
    }
  }

  const layers = new Map<number, string[]>()
  for (const id of nodeIds) {
    const d = depth.get(id)!
    if (!layers.has(d)) layers.set(d, [])
    layers.get(d)!.push(id)
  }
  for (const layer of layers.values()) {
    layer.sort((a, b) => (visitOrder.get(a) ?? 0) - (visitOrder.get(b) ?? 0))
  }

  const maxColumns = Math.max(...[...layers.values()].map((c) => c.length), 1)
  const positions = new Map<string, NodePosition>()
  for (const [layerDepth, layer] of layers) {
    const offset = ((maxColumns - layer.length) * COLUMN_WIDTH) / 2
    layer.forEach((id, i) => {
      positions.set(id, {
        x: offset + i * COLUMN_WIDTH,
        y: layerDepth * ROW_HEIGHT,
      })
    })
  }
  return positions
}
