import { BUILDER_BLOCKS } from "@/config/builder-blocks"
import { findEvent } from "@/config/event-catalog"
import type { BuilderNodeType, WorkflowExclusivity } from "@/types/domain"

/**
 * La regla escrita en palabras, generada DEL GRAFO.
 *
 * Por qué no basta con el canvas: un grafo dice qué bloques hay y cómo se
 * conectan, pero quien aprueba una regla —o quien la hereda seis meses
 * después— necesita saber qué hace, y reconstruirlo saltando de tarjeta en
 * tarjeta es justamente el trabajo que la herramienta debería ahorrar.
 *
 * Por qué generada y no escrita a mano: una descripción escrita a mano se
 * desincroniza en el primer cambio, y entonces es peor que no tenerla —
 * dice con confianza algo que ya no es cierto. Aquí cambiar una condición o
 * el cupón elegido cambia la frase, porque la frase ES el grafo leído.
 *
 * Describe el CAMINO AFIRMATIVO de la regla (qué pasa cuando todo se
 * cumple), no una corrida concreta: eso es la simulación, que es otra cosa
 * y vive en otra pestaña.
 *
 * Puro y sin JSX, mismo criterio que `node-logic.ts`: recibe el grafo ya
 * resuelto y devuelve cláusulas de texto; quien pinta decide el formato.
 */

export type ReadingNode = {
  id: string
  tipo: BuilderNodeType
  etiqueta: string
  config: Record<string, unknown>
}

export type ReadingEdge = {
  source_node_id: string
  source_port: string
  target_node_id: string
}

export type ReadingRule = {
  prioridad: number
  exclusividad: WorkflowExclusivity
  grupoExclusividad: string | null
  vigenteDesde: string
  vigenteHasta: string | null
  /** Estado ya derivado, para poder decir si el motor la está evaluando ahora. */
  estado: string
}

/** Nombres resueltos de lo que vive en otros módulos — ver `NodeLogicInput.refs`. */
export type ReadingRefs = {
  couponBatches?: Record<string, string>
  promotions?: Record<string, string>
  audiences?: Record<string, string>
}

export type ReadingClause = {
  /** `CUANDO`, `SI`, `SEGÚN`… — la palabra que ancla la cláusula. */
  keyword: string
  /** Frase principal. */
  text: string
  /** Puntos, cuando la cláusula enumera (acciones, ramas). */
  items?: string[]
}

const OP_PROSE: Record<string, string> = {
  ">=": "es de al menos",
  ">": "es mayor que",
  "=": "es",
  "!=": "no es",
  "<": "es menor que",
  "<=": "es como máximo",
}

/** Concordancia de número: hay campos cuyo sujeto es plural ("sus compras"). */
const OP_PROSE_PLURAL: Record<string, string> = {
  ">=": "son de al menos",
  ">": "son más de",
  "=": "son",
  "!=": "no son",
  "<": "son menos de",
  "<=": "son como máximo",
}

const PLURAL_FIELDS = new Set([
  "cliente.compras_30d",
  "cliente.dias_sin_comprar",
])

/**
 * Cómo se lee cada campo en una frase. Los que no están caen a su nombre
 * técnico entre comillas: decir `compra.items[].sku` tal cual es peor que
 * una perífrasis, pero inventarle una traducción a un campo que nadie
 * revisó sería decir algo que quizá no significa eso.
 */
const FIELD_PROSE: Record<string, string> = {
  "compra.monto": "el monto de la compra",
  "compra.canal": "el canal de la compra",
  "compra.tienda": "la tienda",
  "compra.tienda_grupo": "el grupo de tiendas",
  "compra.dia_semana": "el día de la semana",
  "compra.items[].categoria": "la categoría de algún producto",
  "compra.items[].marca": "la marca de algún producto",
  "compra.items[].requiere_receta": "que algún producto requiera receta",
  tier: "el nivel del socio",
  "cliente.nivel": "el nivel del socio",
  "cliente.estado_cuenta": "el estado de su cuenta",
  "cliente.segmento": "su segmento",
  "cliente.compras_30d": "sus compras de los últimos 30 días",
  "cliente.gasto_90d": "su gasto de los últimos 90 días",
  "cliente.dias_sin_comprar": "los días que lleva sin comprar",
  "cliente.racha_continuidad": "su racha de compras consecutivas",
  "cliente.saldo_puntos": "su saldo de puntos",
  "cliente.ticket_promedio_3m": "su ticket promedio de 3 meses",
  saldo_puntos: "su saldo de puntos",
  fecha_alta: "su fecha de alta",
  "cupon.estado": "el estado del cupón",
}

const MISSING_DATA_PROSE: Record<string, string> = {
  no_cumple: "la condición no se cumple",
  si_cumple: "la condición sí se cumple",
  omitir: "la condición se omite",
}

type Rule = { field: string; operator: string; value: unknown }
type Group = { combinator: string; rules: (Rule | Group)[] }

function isGroup(node: Rule | Group): node is Group {
  return "rules" in node
}

function fieldProse(field: string): string {
  return FIELD_PROSE[field] ?? `«${field}»`
}

function valueProse(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString("es-CO")
  if (typeof value === "boolean") return value ? "sí" : "no"
  return String(value ?? "—")
}

function conditionProse(group: Group): string {
  const separator = group.combinator === "or" ? " o " : " y "
  return group.rules
    .map((node) => {
      if (isGroup(node)) return `(${conditionProse(node)})`
      const ops = PLURAL_FIELDS.has(node.field) ? OP_PROSE_PLURAL : OP_PROSE
      return `${fieldProse(node.field)} ${ops[node.operator] ?? node.operator} ${valueProse(node.value)}`
    })
    .join(separator)
}

function groupOf(value: unknown): Group | null {
  const group = value as Group | undefined
  return group && Array.isArray(group.rules) ? group : null
}

/**
 * Camino afirmativo: en cada nodo se sigue la salida "buena" —`cumple` en
 * una condición, `exito`/`entregado` en una acción externa. Sin este
 * criterio la lectura enumeraría también las ramas de fallo, y la frase
 * dejaría de describir lo que la regla HACE para describir todo lo que
 * podría pasar.
 *
 * Una ramificación es la excepción: ahí se siguen todas las ramas, porque
 * ninguna es "la buena" — son alternativas y la lectura las enumera como
 * tales.
 */
function happyPath(nodes: ReadingNode[], edges: ReadingEdge[]): ReadingNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const entry = nodes.find(
    (n) => n.tipo === "evento" || n.tipo === "webhook_entrante"
  )
  if (!entry) return []

  const seen = new Set<string>()
  const order: ReadingNode[] = []
  const queue = [entry.id]

  while (queue.length) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    const node = byId.get(id)
    if (!node) continue
    order.push(node)

    const outgoing = edges.filter((e) => e.source_node_id === id)
    const ports = outgoing.map((e) => e.source_port)
    let follow: string[]
    if (node.tipo === "condicion_multiple") follow = ["cumple"]
    else if (ports.includes("exito")) follow = ["exito"]
    else if (ports.includes("entregado")) follow = ["entregado"]
    else if (node.tipo === "ramificacion_valor" || node.tipo === "split_ab") {
      follow = ports
    } else follow = ports.slice(0, 1)

    for (const edge of outgoing) {
      if (follow.includes(edge.source_port)) queue.push(edge.target_node_id)
    }
  }
  return order
}

const ACTION_TYPES: readonly BuilderNodeType[] = [
  "acumular_puntos",
  "canjear_puntos",
  "cambio_nivel",
  "emitir_cupon",
  "reto",
  "referido",
  "ajustar_puntos",
  "revertir_beneficios",
  "email",
  "push",
  "sms_whatsapp",
  "aplicar_promocion",
  "webhook_saliente",
  "actualizar_cliente",
  "cambiar_segmento",
  "emitir_evento",
]

function reference(
  map: Record<string, string> | undefined,
  id: unknown,
  fallback: string
): string {
  if (typeof id !== "string") return fallback
  return map?.[id] ?? "el elegido"
}

function actionProse(node: ReadingNode, refs: ReadingRefs): string {
  const { config } = node
  switch (node.tipo) {
    case "emitir_cupon": {
      const batch = reference(
        refs.couponBatches,
        config.coupon_batch_id,
        "una emisión sin elegir"
      )
      return config.modo === "asignar"
        ? `asigna al socio un cupón ya creado del lote «${batch}», y el stock del lote baja en 1`
        : `emite un cupón nuevo de la emisión «${batch}», con código generado en ese momento`
    }
    case "aplicar_promocion": {
      const promotion = reference(
        refs.promotions,
        config.promocion_id,
        "una promoción sin elegir"
      )
      return `aplica la promoción «${promotion}»`
    }
    case "acumular_puntos": {
      const multiplier = config.multiplierOverride
      return typeof multiplier === "number"
        ? `acumula puntos con multiplicador ×${String(multiplier)}`
        : "acumula puntos con el multiplicador del nivel del socio"
    }
    case "email":
    case "push":
    case "sms_whatsapp":
      return `envía un mensaje por ${BUILDER_BLOCKS[node.tipo].label.toLowerCase()}`
    case "webhook_saliente":
      return "llama a un sistema externo"
    case "actualizar_cliente":
      return config.operacion === "tag"
        ? `${config.accion_etiqueta === "quitar" ? "quita" : "agrega"} la etiqueta «${String(config.etiqueta ?? "sin definir")}» al socio`
        : `escribe «${String(config.valor ?? "sin definir")}» en el atributo ${String(config.atributo ?? "sin definir")} del socio`
    case "cambiar_segmento": {
      const audience = reference(
        refs.audiences,
        config.audiencia_id,
        "una audiencia sin elegir"
      )
      return `${config.accion === "quitar" ? "saca" : "mete"} al socio ${config.accion === "quitar" ? "de" : "en"} la audiencia «${audience}»`
    }
    case "emitir_evento":
      return `publica el evento «${String(config.evento_id ?? "sin elegir")}» al catálogo, para que otra regla pueda reaccionar`
    default:
      return `${BUILDER_BLOCKS[node.tipo].label.toLowerCase()} — ${node.etiqueta}`
  }
}

function triggerProse(node: ReadingNode): string {
  if (node.tipo === "webhook_entrante") {
    return "llega una llamada al webhook de esta regla."
  }
  const event = findEvent(
    typeof node.config.evento_id === "string" ? node.config.evento_id : null
  )
  if (!event) return "todavía no se ha elegido ningún evento de entrada."

  const base = `ocurre que ${event.description.replace(/\.$/, "").toLowerCase()} — trigger «${event.id}»`

  if (node.config.modo_disparo === "al_cruzar_umbral") {
    const threshold = node.config.umbral_valor
    const once = node.config.repeticion === "una_vez"
    const edge = node.config.deteccion !== "nivel"
    return (
      `${base}. Concretamente, cada vez que ${fieldProse(event.thresholdField ?? "")} cruza un múltiplo de ` +
      `${valueProse(threshold)}${once ? ", y solo la primera vez por socio" : ", una vez por cada múltiplo alcanzado"}. ` +
      (edge
        ? "En modo borde se mira el salto, no el estado: si el valor se queda por encima del umbral, no se vuelve a disparar."
        : "En modo nivel se vuelve a disparar en cada evaluación mientras el valor siga por encima del umbral.") +
      " Si nadie cruza el umbral, el evento no se emite: eso no es lo mismo que emitirlo y no cumplir las condiciones."
    )
  }
  if (node.config.modo_disparo === "programado") {
    return `${base}. Se evalúa de forma programada (${String(node.config.cadencia ?? "sin cadencia")}, a las ${String(node.config.hora_ejecucion ?? "??")} ${String(node.config.zona_horaria ?? "sin zona")}).`
  }
  return `${base}, evaluado cada vez que ocurre.`
}

type BranchRef = { id: string; label: string; condition?: unknown }

function branchesOf(config: Record<string, unknown>): BranchRef[] {
  return Array.isArray(config.branches) ? (config.branches as BranchRef[]) : []
}

/** Primera letra en mayúscula — `actionProse` compone frases en minúscula porque se enumeran tras dos puntos. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Cómo se lee cada modo de disparo en una línea corta. */
function triggerModeProse(config: Record<string, unknown>): string | null {
  const event = findEvent(
    typeof config.evento_id === "string" ? config.evento_id : null
  )
  switch (config.modo_disparo) {
    case "al_ocurrir":
      return "Cada vez que ocurre."
    case "al_cruzar_umbral": {
      const campo = event?.thresholdField
        ? fieldProse(event.thresholdField)
        : "el valor acumulado"
      const cada =
        config.repeticion === "una_vez"
          ? "solo la primera vez por socio"
          : "una vez por cada múltiplo"
      const modo =
        config.deteccion === "nivel"
          ? "en cada evaluación mientras siga por encima"
          : "una sola vez por cruce"
      return `Cuando ${campo} cruza cada ${valueProse(config.umbral_valor)}: ${cada}, ${modo}.`
    }
    case "programado":
      return `Programado: ${String(config.cadencia ?? "sin cadencia")} a las ${String(config.hora_ejecucion ?? "??")} (${String(config.zona_horaria ?? "sin zona horaria")}).`
    default:
      return null
  }
}

/** Detalles que cambian lo que el bloque hace, y que la frase principal no alcanza a decir. */
function detailProse(node: ReadingNode): string[] {
  const { config } = node
  const lines: string[] = []

  if (node.tipo === "emitir_cupon" && config.modo !== "asignar") {
    lines.push(
      config.titular === "al_portador"
        ? "Al portador: sin titular, lo usa quien lo tenga."
        : "A nombre del socio del flujo."
    )
    if (typeof config.vigencia_dias === "number") {
      lines.push(
        `Vence ${String(config.vigencia_dias)} días después de emitirse.`
      )
    }
    if (config.costo_puntos === 0) {
      lines.push("Sin costo en puntos: es un hito, no un canje.")
    } else if (typeof config.costo_puntos === "number") {
      lines.push(
        `Cuesta ${valueProse(config.costo_puntos)} puntos, que se cobran ${config.timing_puntos === "on_redeem" ? "al redimirlo" : "al emitirlo"}.`
      )
    }
    if (typeof config.entrega === "string") {
      lines.push(
        config.entrega === "ninguno"
          ? "No se envía a ningún lado: queda en su cuenta."
          : `Se entrega por ${String(config.entrega).replace("_", " + ")}.`
      )
    }
  }

  if (node.tipo === "acumular_puntos") {
    if (typeof config.capPerTransaction === "number") {
      lines.push(
        `Con un tope de ${valueProse(config.capPerTransaction)} puntos por ticket.`
      )
    }
    if (typeof config.accumulatedCap === "number") {
      lines.push(
        `Y un tope acumulado de ${valueProse(config.accumulatedCap)} puntos.`
      )
    }
  }

  if (node.tipo === "webhook_saliente") {
    if (typeof config.reintentos === "number") {
      lines.push(
        `Reintenta ${String(config.reintentos)} veces antes de salir por «Error».`
      )
    }
  }

  if (node.tipo === "fin_workflow") {
    if (config.permitir_reingreso === true) {
      lines.push("El socio puede volver a entrar al flujo más adelante.")
    }
    if (config.registrar_analitica === true) {
      lines.push("Queda registrado en la analítica del flujo.")
    }
  }

  return lines
}

const END_RESULT_PROSE: Record<string, string> = {
  conversion: "Termina el flujo y lo marca como una conversión.",
  abandono: "Termina el flujo y lo marca como un abandono.",
  completado_sin_conversion:
    "Termina el flujo sin conversión: el socio llegó al final sin recibir el beneficio.",
}

/**
 * Qué hace UN bloque, en lenguaje natural, para el desplegable de su
 * tarjeta en el canvas.
 *
 * Convive con `nodeLogicLines` (`inspector/node-logic.ts`), que dice lo
 * mismo en pseudocódigo, y el canvas elige según el grupo del bloque: los
 * de Lógica se leen mejor como código —un árbol de condiciones anidado o un
 * `SWITCH` con sus casos es más claro tabulado que en prosa—, y el resto
 * —Entrada, Lealtad, Acciones, Fin— se leen mejor como frases, porque lo
 * que hacen es una acción, no una estructura.
 *
 * Reusa el vocabulario de la lectura de la regla a propósito: si el bloque
 * y la frase de la lectura describieran lo mismo con palabras distintas,
 * habría que decidir cuál de las dos creer.
 */
export function nodeProse(node: ReadingNode, refs: ReadingRefs = {}): string[] {
  if (node.tipo === "evento" || node.tipo === "webhook_entrante") {
    const event = findEvent(
      typeof node.config.evento_id === "string" ? node.config.evento_id : null
    )
    const lines: string[] = []
    if (node.tipo === "webhook_entrante") {
      lines.push("Arranca cuando un sistema externo llama a este webhook.")
    } else if (event) {
      lines.push(
        `Arranca cuando ${event.description.replace(/\.$/, "").toLowerCase()}.`
      )
      const modo = triggerModeProse(node.config)
      if (modo) lines.push(modo)
    } else {
      lines.push("Todavía no se ha elegido el evento que lo dispara.")
    }
    if (typeof node.config.frecuencia_maxima === "number") {
      lines.push(
        `Como máximo ${String(node.config.frecuencia_maxima)} veces por socio y día.`
      )
    }
    return lines
  }

  if (node.tipo === "fin_workflow") {
    const resultado = String(node.config.resultado ?? "")
    return [
      END_RESULT_PROSE[resultado] ?? "Termina el flujo.",
      ...detailProse(node),
    ]
  }

  return [capitalize(actionProse(node, refs)) + ".", ...detailProse(node)]
}

export function ruleReading(
  nodes: ReadingNode[],
  edges: ReadingEdge[],
  rule: ReadingRule,
  refs: ReadingRefs = {}
): ReadingClause[] {
  const walk = happyPath(nodes, edges)
  if (!walk.length) {
    return [
      {
        keyword: "TODAVÍA NO",
        text: "La regla no tiene bloque de entrada, así que no hay nada que leer: nada la dispararía.",
      },
    ]
  }

  const clauses: ReadingClause[] = []

  clauses.push({ keyword: "CUANDO", text: triggerProse(walk[0]) })

  const conditions = walk.filter((n) => n.tipo === "condicion_multiple")
  if (conditions.length) {
    const phrases = conditions
      .map((n) => groupOf(n.config.condiciones))
      .filter((g): g is Group => !!g && g.rules.length > 0)
      .map(conditionProse)
    const policy =
      MISSING_DATA_PROSE[
        String(conditions[0].config.siFaltaElDato ?? "no_cumple")
      ]
    clauses.push({
      keyword: "SI",
      text: phrases.length
        ? `${phrases.join("; y además ")}. Cuando el socio no trae el dato de un campo, ${policy}.`
        : "hay bloques de condición, pero todavía sin reglas dentro: no acotan a nadie.",
    })
  } else {
    clauses.push({
      keyword: "SI",
      text: "no hay condiciones: aplica a todo el que reciba el evento.",
    })
  }

  const branching = walk.find((n) => n.tipo === "ramificacion_valor")
  if (branching) {
    clauses.push({
      keyword: "SEGÚN",
      text: "se toma un camino distinto por rama, el de la primera cuya condición se cumple:",
      items: branchesOf(branching.config).map((branch) => {
        const group = groupOf(branch.condition)
        return group && group.rules.length
          ? `${branch.label} — cuando ${conditionProse(group)}`
          : `${branch.label} — cuando no encaja ninguna anterior`
      }),
    })
  }

  const actions = walk.filter((n) => ACTION_TYPES.includes(n.tipo))
  clauses.push({
    keyword: "ENTONCES",
    text: actions.length
      ? branching
        ? "según la rama que se tome, la regla ejecuta una sola de estas:"
        : "la regla:"
      : "no ejecuta ninguna acción todavía.",
    items: actions.map((n) => actionProse(n, refs)),
  })

  // Las dos capas de condición no se mezclan: las de la regla acotan al
  // SOCIO; las de la promoción acotan el CARRITO y el producto, y las
  // evalúa su propio motor. Confundirlas lleva a "la regla no funciona"
  // cuando en realidad el socio sí era elegible y el carrito no.
  if (actions.some((n) => n.tipo === "aplicar_promocion")) {
    clauses.push({
      keyword: "Y ADEMÁS",
      text:
        "la promoción trae sus propias condiciones, que evalúa el Promotion Engine sobre el carrito — no esta regla sobre el socio. " +
        "Si el carrito no las cumple, la promoción simplemente no descuenta, aunque el socio sí fuera elegible.",
    })
  }

  const how: string[] = []
  if (branching) {
    how.push(
      "las acciones son alternativas: se ejecuta la de la rama tomada, no todas"
    )
  }
  if (walk.some((n) => n.tipo === "union")) {
    how.push("un bloque de unión espera a las ramas vivas antes de seguir")
  }
  if (!branching && actions.length > 1) {
    how.push("las acciones se ejecutan en secuencia, en el orden del grafo")
  }
  if (walk.some((n) => n.tipo === "webhook_saliente" || n.tipo === "email")) {
    how.push(
      "cada llamada externa abre camino propio según su resultado — éxito, error al agotar los reintentos, y timeout aparte; el reintento es interno al bloque, no una arista, porque el grafo no admite ciclos"
    )
  }
  const wait = walk.find((n) => n.tipo === "espera_hasta_evento")
  if (wait) {
    how.push(
      `la espera se cierra solo con el evento del mismo socio, correlacionado por «${String(wait.config.llave_correlacion ?? "sin declarar")}»`
    )
  }
  if (how.length) {
    clauses.push({ keyword: "CÓMO", text: `${how.join("; ")}.` })
  }

  clauses.push({
    keyword: "MIENTRAS",
    text: `esté vigente del ${rule.vigenteDesde} ${rule.vigenteHasta ? `al ${rule.vigenteHasta}` : "en adelante"}, y la regla esté en estado Activa. Ahora mismo está ${rule.estado}.`,
  })

  clauses.push({
    keyword: "SALVO",
    text:
      rule.exclusividad === "exclusiva"
        ? `que gane otra regla: esta lleva prioridad ${String(rule.prioridad)} y es exclusiva${rule.grupoExclusividad ? ` en el grupo «${rule.grupoExclusividad}»` : ""}. Si dos del mismo grupo aplican al mismo evento, gana la de mayor prioridad y la otra queda registrada como descartada, con su motivo.`
        : `nada: esta regla es acumulable (prioridad ${String(rule.prioridad)}), así que se aplica junto con las demás que respondan al mismo evento.`,
  })

  const negative = nodes.filter(
    (n) =>
      n.tipo === "condicion_multiple" &&
      edges.some(
        (e) => e.source_node_id === n.id && e.source_port === "no_cumple"
      )
  )
  if (negative.length) {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    clauses.push({
      keyword: "SI NO",
      text: "cuando la condición no se cumple, el flujo sigue por su otra salida:",
      items: negative.flatMap((n) =>
        edges
          .filter(
            (e) => e.source_node_id === n.id && e.source_port === "no_cumple"
          )
          .map((e) => {
            const target = byId.get(e.target_node_id)
            return `desde «${n.etiqueta}» hacia «${target?.etiqueta ?? "un bloque eliminado"}»`
          })
      ),
    })
  }

  return clauses
}
