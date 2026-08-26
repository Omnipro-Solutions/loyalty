import type { BuilderNodeType } from "@/types/domain"

/**
 * Variables que cada tipo de bloque deja disponibles para los bloques
 * siguientes del flujo — lista extraída de la fila "Expone" del catálogo
 * de Figma (`1109:4478 · 08.4`) para cada tipo documentado ahí. Sigue sin
 * haber un motor de ejecución real que las inyecte en producción (ver
 * `features/builder/engine/simulate.ts`) — pero qué bloque ANTERIOR en el
 * grafo produjo cada variable (lo que el mockup de Figma "Inspector · Email
 * de reactivación · Datos" muestra como "desde Acumular puntos") sí se
 * resuelve ahora — ver `resolveAvailableVariables` más abajo. `canje_cupon`
 * y `alta_socio` no tienen tarjeta en el catálogo de Figma; se les dejó una
 * lista mínima razonable.
 *
 * Vive fuera de `data-tab.tsx` porque el mapeo de parámetros de
 * `integration-message-form.tsx` (bloques `email`/`push`/`sms_whatsapp`) y
 * el selector de campos de `multi-condition-form.tsx` (bloque
 * `condicion_multiple`) necesitan la misma lista, resuelta contra el grafo
 * real de cada workflow, para ofrecer solo las variables que de verdad
 * llegan hasta ese nodo.
 */
export const VARIABLES_BY_TYPE: Partial<Record<BuilderNodeType, string[]>> = {
  // `compra.canal`, `compra.fecha`, `compra.dia_semana` (derivada de
  // `compra.fecha`, mismo criterio que `cliente.edad` en
  // `condition-preview.ts`) y `compra.items[].*` (a diferencia del resto de
  // la lista) sí tienen tabla real detrás: `pedidos.canal`/`creado_en` y
  // `pedido_items` ↔ `productos`/`categorias` (`sku`, `marca`,
  // `tipo_producto`/`categoria_id`.nombre, `cantidad`, `precio_unitario`) —
  // ver `docs/builder.md` §5.3-5.4. Se agregan aquí como catálogo (mismo
  // trato que el resto de variables "expuestas"); no hay todavía un
  // simulador que evalúe reglas de evento contra un caso concreto, eso es
  // un motor aparte (ver `AccumulatePointsForm` — sus modificadores/bonos
  // sobre estas variables se marcan "activos" a mano en el ejemplo).
  evento_compra: [
    "compra.monto",
    "compra.tienda",
    "compra.canal",
    "compra.fecha",
    "compra.dia_semana",
    "compra.items",
    "compra.items[].sku",
    "compra.items[].marca",
    "compra.items[].categoria",
    "compra.items[].cantidad",
    "compra.items[].precio_unitario",
    // RX/OTC (docs/promociones.md §8) — `productos.requiere_receta`,
    // mismo criterio que el resto de `compra.items[].*`: catálogo real,
    // sin motor de evaluación en vivo todavía.
    "compra.items[].requiere_receta",
    "cliente.id",
  ],
  entra_segmento: ["audiencia.id", "cliente.segmento", "cliente.nivel"],
  canje_cupon: ["cupon.codigo"],
  fecha_recurrente: ["ejecucion.fecha", "cliente.cumpleanos"],
  alta_socio: ["socio.id", "socio.tier"],
  acumular_puntos: ["puntos.otorgados", "puntos.saldo", "puntos.vencimiento"],
  canjear_puntos: ["canje.id", "puntos.descontados", "puntos.saldo"],
  cambio_nivel: ["nivel.anterior", "nivel.actual", "nivel.vigencia"],
  emitir_cupon: ["cupon.codigo", "cupon.vence", "cupon.valor"],
  reto: ["reto.progreso", "reto.meta", "reto.estado"],
  referido: ["referido.id", "referido.estado", "recompensa.otorgada"],
  email: ["mensaje.id", "mensaje.estado", "mensaje.abierto"],
  push: ["mensaje.id", "mensaje.estado", "mensaje.abierto"],
  sms_whatsapp: ["mensaje.id", "mensaje.estado"],
  aplicar_promocion: ["regla.id", "regla.vence"],
  condicion_multiple: ["condicion.resultado", "condicion.evaluadas"],
  ramificacion_valor: ["rama.nombre", "rama.valor"],
  split_ab: ["test.variante", "test.grupo"],
  esperar: ["espera.inicio", "espera.fin"],
  fin_workflow: ["workflow.resultado", "workflow.duracion"],
}

/**
 * Heurística por nombre de variable (mismo criterio que usaría alguien
 * leyendo el nombre): no hay un tipo declarado explícito en el catálogo de
 * Figma por variable individual (solo en las PROPIEDADES de entrada), así
 * que se infiere de sufijos comunes en vez de marcarlas todas "texto".
 */
export function inferType(variable: string): string {
  const suffix = variable.split(".").pop() ?? ""
  if (
    /^(monto|saldo|valor|progreso|meta|descontados|otorgados|cantidad|precio_unitario)$/.test(
      suffix
    )
  )
    return "número"
  if (/^(fecha|vence|vigencia|inicio|fin|duracion|cumpleanos)$/.test(suffix))
    return "fecha"
  if (/^(abierto|evaluadas|requiere_receta)$/.test(suffix)) return "booleano"
  if (
    /^(estado|resultado|tier|nivel|actual|anterior|segmento|grupo|variante|nombre)$/.test(
      suffix
    )
  )
    return "enum"
  return "texto"
}

export type GraphNodeRef = {
  id: string
  tipo: BuilderNodeType
  etiqueta: string
}

export type GraphEdgeRef = {
  source_node_id: string
  target_node_id: string
}

export type GraphVariable = {
  name: string
  /** Id del nodo del grafo que expone esta variable — para diferenciar dos bloques del mismo tipo con nombres distintos. */
  sourceNodeId: string
  /** `etiqueta` real del nodo (no `BUILDER_BLOCKS[tipo].label`) — así "Compra grande" y "Compra POS" no se confunden entre sí en el picker. */
  sourceLabel: string
}

/**
 * Variables realmente disponibles en `targetNodeId`: las que exponen los
 * bloques que lo preceden en ESTE grafo (cualquier camino que llegue hasta
 * acá, no solo el padre directo) — no el catálogo completo de los 19 tipos.
 * BFS hacia atrás sobre `edges`; un `visited` evita recorrer dos veces un
 * ancestro común a varias ramas (y protege contra un ciclo en un borrador a
 * medio construir, el mismo caso que ya maneja `simulateWorkflow`).
 */
export function resolveAvailableVariables(
  nodes: GraphNodeRef[],
  edges: GraphEdgeRef[],
  targetNodeId: string
): GraphVariable[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const parentsByNode = new Map<string, string[]>()
  for (const e of edges) {
    const parents = parentsByNode.get(e.target_node_id) ?? []
    parents.push(e.source_node_id)
    parentsByNode.set(e.target_node_id, parents)
  }

  const ancestors = new Set<string>()
  const pending = [...(parentsByNode.get(targetNodeId) ?? [])]
  while (pending.length) {
    const id = pending.pop()!
    if (ancestors.has(id)) continue
    ancestors.add(id)
    pending.push(...(parentsByNode.get(id) ?? []))
  }

  const variables: GraphVariable[] = []
  for (const id of ancestors) {
    const node = byId.get(id)
    if (!node) continue
    for (const name of VARIABLES_BY_TYPE[node.tipo] ?? []) {
      variables.push({ name, sourceNodeId: id, sourceLabel: node.etiqueta })
    }
  }
  return variables.sort((a, b) => a.name.localeCompare(b.name))
}
