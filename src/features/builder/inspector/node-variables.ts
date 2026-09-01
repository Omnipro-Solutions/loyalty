import { findEvent } from "@/config/event-catalog"
import type { BuilderNodeType } from "@/types/domain"

/**
 * Variables que cada tipo de bloque deja disponibles para los bloques
 * siguientes del flujo — lista extraída de la fila "Expone" del catálogo
 * de Figma (`1109:4478 · 08.4`) para cada tipo documentado ahí. Sigue sin
 * haber un motor de ejecución real que las inyecte en producción (ver
 * `features/builder/engine/simulate.ts`) — pero qué bloque ANTERIOR en el
 * grafo produjo cada variable (lo que el mockup de Figma "Inspector · Email
 * de reactivación · Datos" muestra como "desde Acumular puntos") sí se
 * resuelve ahora — ver `resolveAvailableVariables` más abajo.
 *
 * El bloque `evento` NO está en esta tabla: sus variables son el `payload`
 * del evento elegido del catálogo (`config/event-catalog.ts`), así que
 * dependen de la config del nodo y no solo de su tipo. Ver
 * `variablesForNode`, que es la entrada correcta para preguntar «qué expone
 * este nodo».
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
  // `compra.tienda_grupo` respalda `tiendas.grupo_id`/`tienda_grupos.nombre`
  // (ver `20260826260000_tienda_grupos.sql`) — mismo trato que `compra.tienda`,
  // sin un `Field` de opciones cerradas en este editor (cae a "texto" en
  // `inferType`, igual que `compra.tienda`).
  // `evento` NO está aquí: sus variables son el `payload` del evento
  // elegido, así que dependen de la config del nodo, no solo de su tipo —
  // ver `variablesForNode`.
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
  // Sin tarjeta en el catálogo de Figma — mismo trato mínimo razonable que
  // el resto de bloques sin diseño.
  webhook_entrante: ["webhook.payload", "webhook.recibido_en"],
  webhook_saliente: ["webhook.status_code", "webhook.respuesta"],
  // Sin tarjeta en el catálogo de Figma — mismo trato mínimo razonable,
  // grounded en las tablas reales que respaldan cada bloque (ver
  // `field-specs.ts` para el detalle de cada uno).
  ajustar_puntos: ["puntos.ajustados", "puntos.saldo"],
  // Lo que el contra-flujo deja disponible para las ramas que cuelgan de sus
  // puertos: sin esto, el email que explica qué quedó pendiente tendría que
  // volver a consultar el cálculo.
  revertir_beneficios: [
    "reversion.puntos_revertidos",
    "reversion.puntos_absorbidos",
    "reversion.puntos_deuda",
    "reversion.saldo_resultante",
    "reversion.clases_tocadas",
    "reversion.motivo",
  ],
  espera_hasta_evento: ["espera.inicio", "espera.fin", "espera.evento_id"],
  ventana_horaria: ["espera.inicio", "espera.fin"],
  esperar_aprobacion: ["aprobacion.decidido_por", "aprobacion.nota"],
  // Bloques nuevos — mismo trato mínimo razonable que el resto sin tarjeta
  // de Figma: lo que la acción deja escrito y que el flujo siguiente puede
  // querer leer.
  actualizar_cliente: [
    "cliente.atributo_actualizado",
    "cliente.valor_anterior",
  ],
  cambiar_segmento: ["segmento.anterior", "segmento.actual"],
  emitir_evento: ["evento.id", "evento.publicado_en"],
  union: ["union.ramas_completadas"],
}

/**
 * Variables que el Loyalty Engine calcula sobre el histórico del socio y
 * expone como cualquier otra: agregaciones (`COUNT`, `SUM` sobre una
 * ventana) que el builder NO aprende a hacer.
 *
 * Por qué importa la frontera: casos como «5 compras en 30 días» pedían un
 * evaluador con operadores de agregación dentro del constructor de
 * condiciones — un motor de consultas embebido en la UI. Con estas
 * variables el caso se resuelve con el operador escalar que ya existe
 * (`cliente.compras_30d >= 5`), y la ventana y el agregado son
 * responsabilidad de quien tiene los datos.
 *
 * Están disponibles en CUALQUIER nodo: no las produce un bloque anterior
 * del grafo, llegan del socio.
 */
export const CALCULATED_VARIABLES = [
  "cliente.compras_30d",
  "cliente.gasto_90d",
  "cliente.dias_sin_comprar",
  "cliente.ticket_promedio_3m",
  "cliente.racha_continuidad",
  "cliente.saldo_puntos",
  "cliente.puntos_acumulados",
  "cliente.gasto_acumulado",
] as const

/**
 * Qué expone un nodo concreto. Para casi todos es su lista por tipo; para
 * `evento` es el `payload` del evento elegido en el catálogo, porque un
 * `order.completed` y un `member.enrolled` son el mismo TIPO de bloque y
 * exponen cosas distintas.
 *
 * Sin evento elegido devuelve vacío a propósito: ofrecer las variables de
 * un evento que todavía no se eligió sería prometer datos que el motor no
 * va a inyectar.
 */
export function variablesForNode(
  tipo: BuilderNodeType,
  config: Record<string, unknown> = {}
): string[] {
  if (tipo === "evento") {
    const event = findEvent(
      typeof config.evento_id === "string" ? config.evento_id : null
    )
    return event ? event.payload : []
  }
  return VARIABLES_BY_TYPE[tipo] ?? []
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
    /^(monto|saldo|valor|progreso|meta|descontados|otorgados|cantidad|precio_unitario|hito|compras_30d|gasto_90d|dias_sin_comprar|ticket_promedio_3m|racha_continuidad|puntos_acumulados|gasto_acumulado|ramas_completadas|vence_en_dias|por_vencer|descuento)$/.test(
      suffix
    )
  )
    return "número"
  if (/^(fecha|vence|vigencia|inicio|fin|duracion|cumpleanos)$/.test(suffix))
    return "fecha"
  if (
    /^(abierto|evaluadas|requiere_receta|tiene_hijos|tiene_mascotas)$/.test(
      suffix
    )
  )
    return "booleano"
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
  /** Necesaria para `evento`, cuyo payload depende del evento elegido — ver `variablesForNode`. */
  config?: Record<string, unknown>
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
    for (const name of variablesForNode(node.tipo, node.config)) {
      variables.push({ name, sourceNodeId: id, sourceLabel: node.etiqueta })
    }
  }
  return variables.sort((a, b) => a.name.localeCompare(b.name))
}
