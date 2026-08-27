import type { WorkflowTriggerMode } from "@/types/domain"

/**
 * Catálogo de eventos del programa de lealtad — la lista que hace posible
 * que el builder tenga UN bloque de Entrada (`evento`) en vez de uno por
 * evento.
 *
 * Antes cada evento de negocio era un tipo de bloque (`evento_compra`,
 * `alta_socio`, `canje_cupon`…): agregar "cupón por vencer" o "el saldo
 * cruzó un umbral" significaba un tipo nuevo en `BUILDER_NODE_GROUPS`, su
 * `FieldSpec`, su icono, su fila en el `check` de `workflow_nodes.tipo` y
 * una migración. Con el evento como DATO, agregar uno es agregar una
 * entrada a este archivo.
 *
 * Se elige en tres pasos, que es como lo piensa quien configura: dominio →
 * evento → modo de disparo. El `payload` se ve al elegir el evento, antes
 * de configurar nada más, para saber con qué variables se va a poder
 * trabajar más adelante en el flujo.
 *
 * `id` es el trigger técnico (`order.completed`), no una etiqueta: es lo
 * que el motor escucha y lo que `emitir_evento` publica, así que las dos
 * puntas del catálogo hablan el mismo vocabulario.
 */

export type EventDomain =
  | "cliente"
  | "compra"
  | "carrito"
  | "puntos"
  | "cupon"
  | "promocion"
  | "reward"
  | "segmentacion"
  | "tiempo"

export type CatalogEvent = {
  /** Trigger técnico — lo que escucha el motor (`order.completed`). */
  id: string
  domain: EventDomain
  label: string
  /** Qué acaba de pasar, en una frase — se muestra bajo el evento elegido. */
  description: string
  /**
   * Variables que el evento pone a disposición del resto del flujo. Es el
   * equivalente por-evento de lo que `VARIABLES_BY_TYPE` daba por-tipo-de-
   * bloque; `node-variables.ts` lo lee de aquí para el bloque `evento`.
   */
  payload: string[]
  /**
   * Modos de disparo que tienen sentido para este evento. No todos los
   * admiten los tres: un alta de socio no se puede "cruzar un umbral", y
   * un evento de tiempo solo existe en modo programado. Declararlo aquí
   * evita ofrecer combinaciones que el motor no podría ejecutar.
   */
  triggerModes: readonly WorkflowTriggerMode[]
  /**
   * Campo acumulado contra el que se mide el umbral, para los eventos que
   * admiten `al_cruzar_umbral`. `undefined` en el resto.
   */
  thresholdField?: string
}

export const EVENT_DOMAIN_LABEL: Record<EventDomain, string> = {
  cliente: "Cliente",
  compra: "Compra",
  carrito: "Carrito",
  puntos: "Puntos",
  cupon: "Cupón",
  promocion: "Promoción",
  reward: "Reward",
  segmentacion: "Segmentación",
  tiempo: "Tiempo",
}

/** Variables del socio, disponibles en cualquier evento que lo tenga identificado. */
const SOCIO = ["cliente.id", "cliente.nivel", "cliente.segmento"]

const AL_OCURRIR = ["al_ocurrir"] as const
const OCURRIR_O_UMBRAL = ["al_ocurrir", "al_cruzar_umbral"] as const
const PROGRAMADO = ["programado"] as const

export const EVENT_CATALOG: CatalogEvent[] = [
  // ── Cliente ────────────────────────────────────────────────────────────
  {
    id: "member.enrolled",
    domain: "cliente",
    label: "Alta de socio",
    description: "Alguien se registra en el programa.",
    payload: [...SOCIO, "socio.fecha_alta", "socio.canal_alta"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "member.tier_upgraded",
    domain: "cliente",
    label: "Sube de nivel",
    description: "El socio pasa a un nivel superior.",
    payload: [...SOCIO, "nivel.anterior", "nivel.actual"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "member.tier_downgraded",
    domain: "cliente",
    label: "Baja de nivel",
    description: "El socio pierde nivel al recalcularse el periodo.",
    payload: [...SOCIO, "nivel.anterior", "nivel.actual"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "member.attribute_changed",
    domain: "cliente",
    label: "Cambia un atributo",
    description: "Se actualiza un dato del perfil del socio.",
    payload: [
      ...SOCIO,
      "atributo.nombre",
      "atributo.anterior",
      "atributo.actual",
    ],
    triggerModes: AL_OCURRIR,
  },

  // ── Compra ─────────────────────────────────────────────────────────────
  {
    id: "checkout.calculated",
    domain: "compra",
    label: "Checkout calculado",
    description:
      "El carrito ya tiene totales pero todavía no se pagó — es el único momento en que una promoción puede alterar el precio.",
    payload: [
      ...SOCIO,
      "compra.monto",
      "compra.canal",
      "compra.tienda",
      "compra.tienda_grupo",
      "compra.items[].sku",
      "compra.items[].categoria",
      "compra.items[].marca",
      "compra.items[].cantidad",
      "compra.items[].precio_unitario",
      "compra.items[].requiere_receta",
    ],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "order.paid",
    domain: "compra",
    label: "Compra pagada",
    description: "Se confirmó el cobro. El monto ya no cambia.",
    payload: [
      ...SOCIO,
      "compra.monto",
      "compra.canal",
      "compra.tienda",
      "compra.tienda_grupo",
      "compra.fecha",
      "compra.dia_semana",
    ],
    triggerModes: OCURRIR_O_UMBRAL,
    thresholdField: "cliente.gasto_acumulado",
  },
  {
    id: "order.completed",
    domain: "compra",
    label: "Compra completada",
    description:
      "La orden se entregó y ya no admite devolución inmediata — es el momento seguro para otorgar beneficios.",
    payload: [
      ...SOCIO,
      "compra.monto",
      "compra.canal",
      "compra.tienda",
      "compra.tienda_grupo",
      "compra.fecha",
      "compra.dia_semana",
      "compra.items[].sku",
      "compra.items[].categoria",
      "compra.items[].marca",
      "compra.items[].cantidad",
      "compra.items[].precio_unitario",
      "compra.items[].requiere_receta",
    ],
    triggerModes: OCURRIR_O_UMBRAL,
    thresholdField: "cliente.gasto_acumulado",
  },
  {
    id: "order.returned",
    domain: "compra",
    label: "Devolución",
    description: "Se devolvió una compra, total o parcialmente.",
    payload: [
      ...SOCIO,
      "devolucion.monto",
      "devolucion.motivo",
      "compra.tienda",
      "compra.canal",
    ],
    triggerModes: AL_OCURRIR,
  },

  // ── Carrito ────────────────────────────────────────────────────────────
  {
    id: "cart.updated",
    domain: "carrito",
    label: "Carrito actualizado",
    description: "Se agregó o quitó algo del carrito.",
    payload: [...SOCIO, "carrito.monto", "carrito.items[].sku"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "cart.abandoned",
    domain: "carrito",
    label: "Carrito abandonado",
    description: "El carrito quedó sin actividad y sin cerrar.",
    payload: [...SOCIO, "carrito.monto", "carrito.abandonado_en"],
    triggerModes: AL_OCURRIR,
  },

  // ── Puntos ─────────────────────────────────────────────────────────────
  {
    id: "points.accrued",
    domain: "puntos",
    label: "Puntos acumulados",
    description: "Se acreditaron puntos al socio.",
    payload: [...SOCIO, "puntos.otorgados", "puntos.saldo"],
    triggerModes: OCURRIR_O_UMBRAL,
    thresholdField: "cliente.puntos_acumulados",
  },
  {
    id: "points.redeemed",
    domain: "puntos",
    label: "Puntos canjeados",
    description: "El socio gastó puntos.",
    payload: [...SOCIO, "puntos.canjeados", "puntos.saldo"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "points.expiring",
    domain: "puntos",
    label: "Puntos por vencer",
    description: "Hay puntos que caducan pronto.",
    payload: [...SOCIO, "puntos.por_vencer", "puntos.vence_en_dias"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "points.balance_crossed",
    domain: "puntos",
    label: "El saldo cruza un umbral",
    description:
      "El saldo de puntos pasó un múltiplo — el evento no siempre se emite: si el saldo no llega, no hay disparo.",
    payload: [...SOCIO, "puntos.saldo", "puntos.hito"],
    triggerModes: ["al_cruzar_umbral"],
    thresholdField: "cliente.saldo_puntos",
  },

  // ── Cupón ──────────────────────────────────────────────────────────────
  {
    id: "coupon.issued",
    domain: "cupon",
    label: "Cupón emitido",
    description: "Se creó un cupón para el socio.",
    payload: [...SOCIO, "cupon.id", "cupon.codigo", "cupon.vence"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "coupon.redeemed",
    domain: "cupon",
    label: "Cupón canjeado",
    description: "El socio usó un cupón en una compra.",
    payload: [...SOCIO, "cupon.id", "cupon.codigo", "compra.monto"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "coupon.expiring",
    domain: "cupon",
    label: "Cupón por vencer",
    description: "Un cupón del socio caduca pronto y sigue sin usarse.",
    payload: [...SOCIO, "cupon.id", "cupon.codigo", "cupon.vence_en_dias"],
    triggerModes: AL_OCURRIR,
  },

  // ── Promoción ──────────────────────────────────────────────────────────
  {
    id: "promotion.applied",
    domain: "promocion",
    label: "Promoción aplicada",
    description: "Una promoción alteró el precio de una compra.",
    payload: [...SOCIO, "promocion.id", "promocion.descuento", "compra.monto"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "promotion.budget_exhausted",
    domain: "promocion",
    label: "Presupuesto agotado",
    description: "La promoción llegó a su tope de inversión.",
    payload: ["promocion.id", "promocion.presupuesto_consumido"],
    triggerModes: AL_OCURRIR,
  },

  // ── Reward ─────────────────────────────────────────────────────────────
  {
    id: "reward.assigned",
    domain: "reward",
    label: "Reward asignado",
    description: "Se le asignó una recompensa al socio.",
    payload: [...SOCIO, "reward.id", "reward.nombre"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "reward.redeemed",
    domain: "reward",
    label: "Reward redimido",
    description: "El socio reclamó su recompensa.",
    payload: [...SOCIO, "reward.id", "reward.nombre"],
    triggerModes: AL_OCURRIR,
  },

  // ── Segmentación ───────────────────────────────────────────────────────
  {
    id: "segment.entered",
    domain: "segmentacion",
    label: "Entra a una audiencia",
    description: "El socio empezó a cumplir la definición de la audiencia.",
    payload: [...SOCIO, "audiencia.id", "audiencia.nombre"],
    triggerModes: AL_OCURRIR,
  },
  {
    id: "segment.exited",
    domain: "segmentacion",
    label: "Sale de una audiencia",
    description: "El socio dejó de cumplir la definición de la audiencia.",
    payload: [...SOCIO, "audiencia.id", "audiencia.nombre"],
    triggerModes: AL_OCURRIR,
  },

  // ── Tiempo ─────────────────────────────────────────────────────────────
  {
    id: "schedule.fixed_date",
    domain: "tiempo",
    label: "Fecha fija",
    description: "Un día concreto del calendario.",
    payload: [...SOCIO, "ejecucion.fecha"],
    triggerModes: PROGRAMADO,
  },
  {
    id: "schedule.birthday",
    domain: "tiempo",
    label: "Cumpleaños",
    description: "El día del cumpleaños del socio.",
    payload: [...SOCIO, "ejecucion.fecha", "cliente.cumpleanos"],
    triggerModes: PROGRAMADO,
  },
  {
    id: "schedule.recurring",
    domain: "tiempo",
    label: "Recurrente",
    description: "Cada día, semana o mes.",
    payload: [...SOCIO, "ejecucion.fecha"],
    triggerModes: PROGRAMADO,
  },
]

const BY_ID = new Map(EVENT_CATALOG.map((e) => [e.id, e]))

/** `null` si el id no está en el catálogo — nunca se inventa un evento. */
export function findEvent(id: string | undefined | null): CatalogEvent | null {
  return id ? (BY_ID.get(id) ?? null) : null
}

/** Los eventos de un dominio, en el orden en que están declarados arriba. */
export function eventsInDomain(domain: EventDomain): CatalogEvent[] {
  return EVENT_CATALOG.filter((e) => e.domain === domain)
}

/** Dominios que de verdad tienen eventos, en orden de catálogo. */
export const EVENT_DOMAINS: EventDomain[] = Object.keys(
  EVENT_DOMAIN_LABEL
) as EventDomain[]

/**
 * Modos de disparo del evento elegido. Sin evento todavía no se puede
 * saber, y ofrecer los tres sería ofrecer combinaciones imposibles — así
 * que la lista vacía es la respuesta correcta, no un fallback a todos.
 */
export function triggerModesFor(
  eventId: string | undefined | null
): readonly WorkflowTriggerMode[] {
  return findEvent(eventId)?.triggerModes ?? []
}
