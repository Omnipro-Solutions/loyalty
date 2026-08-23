import { BUILDER_ENTRY_NODE_TIPOS, type BuilderNodeTipo } from "@/types/domain"

export type SimNode = {
  id: string
  tipo: BuilderNodeTipo
  config: Record<string, unknown>
}
export type SimEdge = {
  source_node_id: string
  source_port: string
  target_node_id: string
}

export type SimStep = {
  nodeId: string
  tipo: BuilderNodeTipo
  conteoEntrada: number
  salidas: { port: string; conteo: number }[]
}

const ENTRY_TIPOS = new Set<string>(BUILDER_ENTRY_NODE_TIPOS)

function numeroConfig(
  config: Record<string, unknown>,
  key: string,
  porDefecto: number
): number {
  const v = config[key]
  return typeof v === "number" && Number.isFinite(v) ? v : porDefecto
}

/**
 * Distribuye `entrada` personas entre los puertos de salida de un nodo,
 * según su tipo. Esto es una aproximación de producto (no hay datos reales
 * de miembros evaluándose contra condiciones todavía — ese es un motor de
 * evaluación real, fuera de alcance de un simulador de vista previa) pero
 * determinística y testeable: mismos parámetros, mismo resultado siempre.
 */
function distribuir(
  node: SimNode,
  entrada: number
): { port: string; conteo: number }[] {
  if (entrada <= 0) return []

  if (node.tipo === "condicion_multiple") {
    const pctCumple = Math.min(
      100,
      Math.max(0, numeroConfig(node.config, "porcentaje_cumple_estimado", 60))
    )
    const cumple = Math.round((entrada * pctCumple) / 100)
    return [
      { port: "cumple", conteo: cumple },
      { port: "no_cumple", conteo: entrada - cumple },
    ]
  }

  if (node.tipo === "ramificacion_valor" || node.tipo === "split_ab") {
    const ramas = Array.isArray(node.config.ramas)
      ? (node.config.ramas as { id: string; peso?: number }[])
      : [{ id: "rama_1" }, { id: "por_defecto" }]
    const pesos = ramas.map((r) =>
      typeof r.peso === "number" && r.peso > 0 ? r.peso : 1
    )
    const pesoTotal = pesos.reduce((a, b) => a + b, 0)
    let restante = entrada
    const salidas = ramas.map((r, i) => {
      const esUltima = i === ramas.length - 1
      const conteo = esUltima
        ? restante
        : Math.round((entrada * pesos[i]) / pesoTotal)
      restante -= conteo
      return { port: r.id, conteo }
    })
    return salidas
  }

  if (node.tipo === "acumular_puntos") {
    const pctTope = Math.min(
      100,
      Math.max(0, numeroConfig(node.config, "tasa_tope_estimada", 8))
    )
    const tope = Math.round((entrada * pctTope) / 100)
    return [
      { port: "out", conteo: entrada - tope },
      { port: "tope_alcanzado", conteo: tope },
    ]
  }

  if (node.tipo === "fin_workflow") return []

  return [{ port: "out", conteo: entrada }]
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
export function simularWorkflow(
  nodes: SimNode[],
  edges: SimEdge[],
  cohorteInicial: number
): SimStep[] {
  const porId = new Map(nodes.map((n) => [n.id, n]))
  const salientesPorNodo = new Map<string, SimEdge[]>()
  for (const e of edges) {
    const lista = salientesPorNodo.get(e.source_node_id) ?? []
    lista.push(e)
    salientesPorNodo.set(e.source_node_id, lista)
  }

  const entradaAcumulada = new Map<string, number>()
  const procesados = new Set<string>()
  const pasos: SimStep[] = []

  const entradas = nodes.filter((n) => ENTRY_TIPOS.has(n.tipo))
  const cola: string[] = []
  for (const n of entradas) {
    entradaAcumulada.set(n.id, cohorteInicial)
    cola.push(n.id)
  }

  while (cola.length) {
    const id = cola.shift()!
    if (procesados.has(id)) continue
    procesados.add(id)

    const node = porId.get(id)
    if (!node) continue

    const conteoEntrada = entradaAcumulada.get(id) ?? 0
    const salidas = distribuir(node, conteoEntrada)
    pasos.push({ nodeId: id, tipo: node.tipo, conteoEntrada, salidas })

    for (const salida of salidas) {
      if (salida.conteo <= 0) continue
      const edgesDeEstePuerto = (salientesPorNodo.get(id) ?? []).filter(
        (e) => e.source_port === salida.port
      )
      for (const edge of edgesDeEstePuerto) {
        const previo = entradaAcumulada.get(edge.target_node_id) ?? 0
        entradaAcumulada.set(edge.target_node_id, previo + salida.conteo)
        if (!procesados.has(edge.target_node_id)) {
          cola.push(edge.target_node_id)
        }
      }
    }
  }

  return pasos
}
