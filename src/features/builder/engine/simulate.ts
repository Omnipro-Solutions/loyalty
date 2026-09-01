import { isMessageNodeType } from "@/config/integration-flows"
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
  /**
   * Socios a los que el evento NUNCA llegó a emitirse — solo tiene valor en
   * un bloque `evento` en modo umbral.
   *
   * Es distinto de "no cumplió las condiciones", y la diferencia importa:
   * quien no cruzó el umbral no entró al flujo, así que ninguna condición
   * se evaluó sobre él y no hay nada que revisar en la regla. Quien sí
   * recibió el evento y salió por `no_cumple` sí fue evaluado. Meterlos en
   * el mismo cubo hace que una regla que no dispara nunca parezca una
   * regla demasiado restrictiva.
   */
  notTriggered?: number
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

/** Un porcentaje fuera de [0, 100] repartiría más (o menos) cohorte de la que entró. */
function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value))
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
      ? (node.config.branches as {
          id: string
          weight?: number
          shareEstimate?: number
        }[])
      : [{ id: "rama_1" }, { id: "por_defecto" }]
    // En `ramificacion_valor` el peso ya NO enruta: enruta la condición de
    // cada rama (ver `BranchesTab` y `validateGraph`). Lo que queda aquí es
    // una ESTIMACIÓN de qué proporción de la cohorte cumplirá cada
    // condición, porque este simulador no evalúa socios reales — de ahí
    // `shareEstimate`, con `weight` como respaldo para las ramas guardadas
    // antes del cambio. En `split_ab` el peso sí es el mecanismo: ahí el
    // reparto aleatorio es lo que el bloque hace.
    const weights = branches.map((r) => {
      const share = r.shareEstimate ?? r.weight
      return typeof share === "number" && share > 0 ? share : 1
    })
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

  // Reparto de los 5 desenlaces de una reversión. Estimación de producto,
  // igual que `tasa_tope_estimada` — no hay telemetría de devoluciones
  // todavía. Los defaults salen de lo razonable en retail: casi todo se
  // revierte limpio, y lo que no se reparte entre saldo ya gastado, cupón ya
  // canjeado y beneficio aún pendiente. El resto va por `revertido`, así que
  // los 5 puertos siempre suman la entrada.
  if (node.tipo === "revertir_beneficios") {
    const parcialPct = clampPct(
      configNumber(node.config, "tasa_parcial_estimada", 12)
    )
    const nadaPct = Math.min(
      100 - parcialPct,
      clampPct(configNumber(node.config, "tasa_nada_estimada", 8))
    )
    const noRevPct = Math.min(
      100 - parcialPct - nadaPct,
      clampPct(configNumber(node.config, "tasa_no_reversible_estimada", 4))
    )
    const saldoPct = Math.min(
      100 - parcialPct - nadaPct - noRevPct,
      clampPct(configNumber(node.config, "tasa_saldo_insuficiente_estimada", 6))
    )
    const parcial = Math.round((entrada * parcialPct) / 100)
    const nada = Math.round((entrada * nadaPct) / 100)
    const noRev = Math.round((entrada * noRevPct) / 100)
    const saldo = Math.round((entrada * saldoPct) / 100)
    return [
      { port: "revertido", count: entrada - parcial - nada - noRev - saldo },
      { port: "parcial", count: parcial },
      { port: "nada_por_revertir", count: nada },
      { port: "no_reversible", count: noRev },
      { port: "saldo_insuficiente", count: saldo },
    ]
  }

  // Resultado tipado de una acción externa (ver `OUTPUT_HANDLES`): el
  // reparto es una estimación de producto, igual que `tasa_tope_estimada`
  // de `acumular_puntos` — no hay telemetría real de integraciones todavía.
  // Los defaults salen de lo razonable para un webhook sano; el resto de la
  // cohorte va por `exito`, así que los 3 puertos siempre suman la entrada.
  if (node.tipo === "webhook_saliente") {
    const errorPct = clampPct(
      configNumber(node.config, "tasa_error_estimada", 3)
    )
    const timeoutPct = Math.min(
      100 - errorPct,
      clampPct(configNumber(node.config, "tasa_timeout_estimada", 1))
    )
    const error = Math.round((entrada * errorPct) / 100)
    const timeout = Math.round((entrada * timeoutPct) / 100)
    return [
      { port: "exito", count: entrada - error - timeout },
      { port: "error", count: error },
      { port: "timeout", count: timeout },
    ]
  }

  if (isMessageNodeType(node.tipo)) {
    const failPct = clampPct(
      configNumber(node.config, "tasa_fallo_estimada", 5)
    )
    const fallido = Math.round((entrada * failPct) / 100)
    return [
      { port: "entregado", count: entrada - fallido },
      { port: "fallido", count: fallido },
    ]
  }

  if (node.tipo === "fin_workflow") return []

  return [{ port: "out", count: entrada }]
}

/**
 * Cuántos de `entrada` llegan a RECIBIR el evento.
 *
 * Con `al_ocurrir` y `programado` son todos: el evento llega y el flujo
 * arranca. Con `al_cruzar_umbral` no: quien no cruza el múltiplo nunca
 * genera el evento, así que no entra al flujo. Ese resto es lo que se
 * reporta como `notTriggered` — ver el comentario de `SimStep`.
 *
 * El porcentaje es una estimación de producto (no hay saldos reales de
 * socios en este simulador), igual que `tasa_tope_estimada` de
 * `acumular_puntos`. `una_vez` reduce todavía más: quien ya cruzó ese
 * umbral en el pasado no vuelve a emitir.
 */
function triggeredCount(node: SimNode, entrada: number): number {
  if (node.tipo !== "evento") return entrada
  if (node.config.modo_disparo !== "al_cruzar_umbral") return entrada

  const crossPct = clampPct(
    configNumber(node.config, "tasa_cruce_estimada", 35)
  )
  let fired = Math.round((entrada * crossPct) / 100)
  if (node.config.repeticion === "una_vez") {
    const repeatPct = clampPct(
      configNumber(node.config, "tasa_ya_cruzado_estimada", 40)
    )
    fired -= Math.round((fired * repeatPct) / 100)
  }
  return Math.max(0, Math.min(entrada, fired))
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

  const incomingByNode = new Map<string, SimEdge[]>()
  for (const e of edges) {
    const list = incomingByNode.get(e.target_node_id) ?? []
    list.push(e)
    incomingByNode.set(e.target_node_id, list)
  }

  // Guarda contra un grafo donde una unión espera a un antecesor que nunca
  // llega (un ciclo en un borrador a medio construir): sin él, reencolar
  // sería un bucle infinito. El tope es holgado — solo se agota en un grafo
  // que ya está roto.
  let guard = nodes.length * nodes.length + edges.length + 16

  while (queue.length) {
    const id = queue.shift()!
    if (processed.has(id)) continue

    const node = byId.get(id)
    if (!node) continue

    // Una unión reanuda el flujo: procesarla con la primera rama que llega
    // contaría solo esa. Se difiere hasta que todos sus antecesores
    // directos ya se procesaron — con `modo_union: "primera"` da igual el
    // orden, pero esperar no cambia el resultado y mantiene una sola regla.
    if (node.tipo === "union" && guard-- > 0) {
      const pending = (incomingByNode.get(id) ?? []).some(
        (e) => !processed.has(e.source_node_id) && byId.has(e.source_node_id)
      )
      if (pending && queue.length) {
        queue.push(id)
        continue
      }
    }

    processed.add(id)

    const entryCount = accumulatedInputByNode.get(id) ?? 0
    const fired = triggeredCount(node, entryCount)
    const outputs = distribute(node, fired)
    steps.push({
      nodeId: id,
      tipo: node.tipo,
      entryCount,
      outputs,
      ...(fired < entryCount ? { notTriggered: entryCount - fired } : {}),
    })

    for (const output of outputs) {
      if (output.count <= 0) continue
      const edgesForThisPort = (outgoingByNode.get(id) ?? []).filter(
        (e) => e.source_port === output.port
      )
      for (const edge of edgesForThisPort) {
        const target = byId.get(edge.target_node_id)
        const previous = accumulatedInputByNode.get(edge.target_node_id) ?? 0
        // Un fan-out manda a LAS MISMAS personas por varias ramas, así que
        // sumarlas al reunirlas las contaría dos veces: 1.000 socios que se
        // separan en dos caminos siguen siendo 1.000 al juntarse. Fuera de
        // una unión, dos aristas entrantes sí son cohortes distintas
        // (caminos excluyentes que desembocan en el mismo bloque) y ahí la
        // suma es lo correcto.
        accumulatedInputByNode.set(
          edge.target_node_id,
          target?.tipo === "union"
            ? Math.max(previous, output.count)
            : previous + output.count
        )
        if (!processed.has(edge.target_node_id)) {
          queue.push(edge.target_node_id)
        }
      }
    }
  }

  return steps
}
