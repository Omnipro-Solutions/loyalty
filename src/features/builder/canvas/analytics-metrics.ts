import type { RunStepSummary } from "./analytics-queries"

export type BiggestDrop = {
  nodeId: string
  port: string
  label: string
  pct: number
  targetNodeId: string | null
}

type EdgeRef = {
  source_node_id: string
  source_port: string | null
  target_node_id: string
}

/**
 * El paso de rama con peor tasa de salida/entrada de la corrida — compartido
 * entre la tarjeta del canvas (que resalta el nodo de destino) y el listado
 * "Caída por nodo" del sidebar (que resalta la fila), para que ambos
 * señalen siempre el mismo hallazgo.
 */
export function findBiggestDrop(
  steps: RunStepSummary[],
  edges: EdgeRef[]
): BiggestDrop | null {
  let worst: BiggestDrop | null = null
  for (const p of steps) {
    if (p.port === null || p.entryCount <= 0) continue
    const pct = Math.round((p.exitCount / p.entryCount) * 100)
    if (!worst || pct < worst.pct) {
      const edge = edges.find(
        (e) => e.source_node_id === p.nodeId && e.source_port === p.port
      )
      worst = {
        nodeId: p.nodeId,
        port: p.port,
        label: p.label,
        pct,
        targetNodeId: edge?.target_node_id ?? null,
      }
    }
  }
  return worst
}
