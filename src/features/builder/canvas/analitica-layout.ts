export type PosicionNodo = { x: number; y: number }

export const ANCHO_COLUMNA = 340
export const ALTO_FILA = 220

type Arista = {
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
export function calcularLayoutVertical(
  nodeIds: string[],
  edges: Arista[]
): Map<string, PosicionNodo> {
  const salientes = new Map<string, string[]>()
  const gradoEntrada = new Map<string, number>()
  for (const id of nodeIds) gradoEntrada.set(id, 0)
  for (const e of edges) {
    if (!salientes.has(e.source_node_id)) salientes.set(e.source_node_id, [])
    salientes.get(e.source_node_id)!.push(e.target_node_id)
    gradoEntrada.set(
      e.target_node_id,
      (gradoEntrada.get(e.target_node_id) ?? 0) + 1
    )
  }

  const profundidad = new Map<string, number>()
  const ordenVisita = new Map<string, number>()
  let contadorVisita = 0
  const restante = new Map(gradoEntrada)
  const cola = nodeIds.filter((id) => (gradoEntrada.get(id) ?? 0) === 0)
  cola.forEach((id) => profundidad.set(id, 0))

  while (cola.length) {
    const id = cola.shift()!
    if (!ordenVisita.has(id)) ordenVisita.set(id, contadorVisita++)
    for (const destino of salientes.get(id) ?? []) {
      profundidad.set(
        destino,
        Math.max(profundidad.get(destino) ?? 0, (profundidad.get(id) ?? 0) + 1)
      )
      restante.set(destino, (restante.get(destino) ?? 0) - 1)
      if (restante.get(destino) === 0) cola.push(destino)
    }
  }
  // Nodos inalcanzables desde ninguna raíz (grafo desconectado — no debería
  // ocurrir en un grafo que pasó `validarGrafo`) van a la capa 0 al final,
  // para que el layout no se rompa en vez de fallar silenciosamente.
  for (const id of nodeIds) {
    if (!profundidad.has(id)) {
      profundidad.set(id, 0)
      ordenVisita.set(id, contadorVisita++)
    }
  }

  const capas = new Map<number, string[]>()
  for (const id of nodeIds) {
    const d = profundidad.get(id)!
    if (!capas.has(d)) capas.set(d, [])
    capas.get(d)!.push(id)
  }
  for (const capa of capas.values()) {
    capa.sort((a, b) => (ordenVisita.get(a) ?? 0) - (ordenVisita.get(b) ?? 0))
  }

  const maxColumnas = Math.max(...[...capas.values()].map((c) => c.length), 1)
  const posiciones = new Map<string, PosicionNodo>()
  for (const [depth, capa] of capas) {
    const offset = ((maxColumnas - capa.length) * ANCHO_COLUMNA) / 2
    capa.forEach((id, i) => {
      posiciones.set(id, {
        x: offset + i * ANCHO_COLUMNA,
        y: depth * ALTO_FILA,
      })
    })
  }
  return posiciones
}
