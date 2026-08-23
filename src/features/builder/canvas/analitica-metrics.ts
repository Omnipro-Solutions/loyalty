import type { RunStepResumen } from "./analytics-queries"

export type MayorCaida = {
  nodeId: string
  port: string
  etiqueta: string
  pct: number
  targetNodeId: string | null
}

type Arista = {
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
export function encontrarMayorCaida(
  pasos: RunStepResumen[],
  edges: Arista[]
): MayorCaida | null {
  let peor: MayorCaida | null = null
  for (const p of pasos) {
    if (p.port === null || p.conteoEntrada <= 0) continue
    const pct = Math.round((p.conteoSalida / p.conteoEntrada) * 100)
    if (!peor || pct < peor.pct) {
      const edge = edges.find(
        (e) => e.source_node_id === p.nodeId && e.source_port === p.port
      )
      peor = {
        nodeId: p.nodeId,
        port: p.port,
        etiqueta: p.etiqueta,
        pct,
        targetNodeId: edge?.target_node_id ?? null,
      }
    }
  }
  return peor
}
