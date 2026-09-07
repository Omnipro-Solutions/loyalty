import type {
  BenefitType,
  ChannelScope,
  PaymentMethod,
  PromotionPublicationStatus,
  PromotionType,
  ReturnReason,
} from "@/types/domain"

/**
 * Contrato de la bitácora del sistema: qué módulos existen, cómo se
 * nombran y qué forma tiene una fila. Vive en `config` y no junto a la
 * consulta (`lib/system-log.ts`) porque la tabla es un Client Component:
 * importarlo de `lib` arrastraría `lib/supabase/server` —y con él
 * `next/headers`— al bundle del navegador.
 */
/**
 * Los seis módulos que escriben bitácora transaccional. No es una lista de
 * tablas: `journeys` une el ciclo de vida del workflow (`workflow_status_events`)
 * con sus corridas (`workflow_runs`), que viven en tablas distintas y para
 * quien lee el log son el mismo hilo — «se activó» y «corrió» son la misma
 * conversación, y separarlas dejaba sin respuesta la única pregunta que
 * importa: una regla activa que nunca corrió se veía igual que una que corre
 * cada noche.
 *
 * El orden es el de la cadena de hechos, no alfabético: **una compra es el
 * origen de todo lo demás** —acumula puntos, cumple un ciclo de promoción,
 * paga con un cupón— y una devolución es lo que deshace parte de eso. Verlas
 * primero es lo que hace que el resto del hilo se pueda leer como una
 * consecuencia.
 *
 * `compras` y `devoluciones` entran porque eran el agujero más grande del
 * portal: `pedidos`/`pedido_items` alimentan las acumulaciones, el
 * comportamiento de compra, el valor comercial, el RFM y media analítica,
 * pero no había UNA pantalla donde se vieran las filas. Un socio con "faltan
 * 2 piezas" no tenía forma de saber cuáles llevaba ni cuándo las compró.
 *
 * `puntos` entra para que el log sea el histórico COMPLETO de un socio y no
 * uno con un agujero: un canje pagado con puntos dejaba rastro por el lado
 * del cupón, pero el débito —lo que equivale a dinero— no aparecía en
 * ninguna bitácora del sistema. Lo que el log no lleva de `points_ledger` es
 * el saldo acumulado: solo es cierto en una serie completa y ordenada de una
 * sola persona, y aquí se filtra y se corta a las últimas N filas. Ese dato
 * sigue viviendo en la tarjeta «Log de redenciones» de la ficha, que es un
 * extracto de cuenta y no una bitácora.
 */
export const SYSTEM_LOG_MODULES = [
  "compras",
  "devoluciones",
  "promociones",
  "cupones",
  "puntos",
  "journeys",
] as const
export type SystemLogModule = (typeof SYSTEM_LOG_MODULES)[number]

export const SYSTEM_LOG_MODULE_LABEL: Record<SystemLogModule, string> = {
  compras: "Compras",
  devoluciones: "Devoluciones",
  promociones: "Promociones",
  cupones: "Cupones",
  puntos: "Puntos",
  journeys: "Loyalty Builder",
}

/** Cómo se lee el evento de un vistazo, no qué tan grave es el sistema. */
export type SystemLogSeverity = "exito" | "info" | "alerta" | "error"

/**
 * La promoción sobre la que ocurrió el evento, resuelta al leer el log.
 *
 * Antes una fila de promociones solo llevaba el nombre: para saber de qué
 * promoción hablaba había que salir a `/promociones/[id]/editar` y volver.
 * Con esto la fila se explica sola — mecánica, canal, vigencia y consumo—,
 * que es justo lo que hace legible el listado de promos del cliente
 * (`MemberPromotionsCard`, 05.3g) y el que publica Benavides en su web.
 *
 * Solo la traen los eventos de `promociones`: cupones y journeys tienen su
 * propia entidad y mezclarlas aquí obligaría a un campo por módulo.
 */
export type SystemLogPromotion = {
  codigo: string
  tipo: PromotionType
  /**
   * La mecánica real, y sus términos. `tipo` es la taxonomía comercial
   * ("Cantidad"), que no dice qué hace falta para ganarse el beneficio: una
   * 3x2 y una 2x1 se catalogan igual. Sin estos tres campos el log obligaba
   * a leer los metadatos crudos para entender qué se evaluó en la compra.
   */
  tipoBeneficio: BenefitType
  compraCantidad: number | null
  pagaCantidad: number | null
  estadoPublicacion: PromotionPublicationStatus
  canal: ChannelScope
  vigenteDesde: string
  vigenteHasta: string | null
  presupuestoAsignado: number
  presupuestoConsumido: number
  canjes: number
}

/** Una línea de la compra —o de la devolución—, tal como se vendió. */
export type SystemLogOrderLine = {
  sku: string | null
  nombre: string
  cantidad: number
  subtotal: number
  /**
   * Precio de esa venta, no el de hoy (`pedido_items.precio_unitario` se
   * copia al cerrar el pedido). Es lo que permite explicar un subtotal sin
   * dividirlo a mano, y lo que hace comprobable una devolución parcial.
   */
  precioUnitario: number
  /**
   * Qué promoción tocó ESTE SKU y cuánto le quitó
   * (`20260907190000_pedido_desglose_comercial.sql`). Nulo = se vendió a
   * precio de lista, que es la mayoría: solo llevan promoción las líneas de
   * un carrito donde el motor registró el canje.
   */
  promocion: { id: string; codigo: string; nombre: string } | null
  /** Lo que la promoción quitó de la línea. El reembolso se calcula contra `subtotal − descuento`, no contra el precio de lista. */
  descuento: number
  /** IVA **contenido** en lo cobrado de la línea, no sumado encima. */
  impuesto: number
  /** La tasa con la que se vendió: 0 en medicamentos y servicios (excluidos), 0.19 en el resto. */
  impuestoTasa: number
}

/**
 * Un cupón presentado en la compra (`coupon_redemption` atada a su
 * `pedido_id`). Va aparte de las líneas porque descuenta sobre el pedido
 * completo, no sobre un SKU: es la diferencia entre «esta caja iba al 3x2»
 * y «este ticket traía un cupón».
 */
export type SystemLogOrderCoupon = {
  codigo: string
  /** Espeja `coupon.discount_type` — el módulo de cupones va en inglés a propósito (ver CLAUDE.md §3). */
  tipoDescuento: string
  valor: number
  descuento: number
}

/** Un medio de pago de la compra. Varias filas = pago partido. */
export type SystemLogOrderPayment = {
  metodo: PaymentMethod
  importe: number
  /** Solo con `metodo === "puntos"`: el saldo que se quemó. */
  puntos: number | null
  /** Los 4 últimos dígitos, la autorización, el comprobante. */
  referencia: string | null
}

/** Quién compró, con lo que hace falta para identificarlo en el mostrador. */
export type SystemLogOrderMember = {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  documento: string | null
  nivel: string | null
}

/**
 * La compra sobre la que ocurrió el evento, con su desglose.
 *
 * Es la razón de ser del módulo `compras`: el total de un pedido no dice
 * nada por sí solo, y lo que hay que poder responder desde el log es «¿qué
 * se llevó?» — qué SKU, cuántas piezas de cada uno y a qué precio. Ese
 * desglose es además el que explica una acumulación: las tres cajas de la
 * 3x2 se ven aquí, una por una, con su fecha.
 *
 * En una devolución los `lineas` son lo que VOLVIÓ, no lo que se compró, y
 * `devolucion` trae el motivo. Comparten tipo porque comparten pregunta.
 */
export type SystemLogOrder = {
  numeroPedido: string
  canal: string
  tienda: string | null
  /** `pedidos.estado` — `devuelto` es lo que distingue una devolución total. */
  estado: string | null
  /** Cuándo se cerró la compra. En una devolución, la de la compra original. */
  fecha: string | null
  socio: SystemLogOrderMember | null
  /**
   * Con qué se pagó. Vacío cuando la compra es anterior a
   * `20260907180000_pedido_pagos.sql` (o cuando esa migración no está
   * aplicada): el modal lo dice, no lo esconde.
   */
  pagos: SystemLogOrderPayment[]
  /**
   * Bruto a precio de lista (`pedidos.total`, suma de subtotales). Lo que se
   * COBRÓ es `total − descuentoTotal`; se dejó así, y no neto, porque de
   * `pedidos.total` cuelgan LTV, ticket promedio y RFM, y cambiarle el
   * significado movería todos esos números
   * (`20260907190000_pedido_desglose_comercial.sql`). En una devolución, el
   * de la compra original.
   */
  total: number
  /** Piezas (suma de cantidades), que es la unidad de las mecánicas por pieza. */
  piezas: number
  lineas: SystemLogOrderLine[]
  /** Los cupones presentados en la compra. Vacío en la mayoría. */
  cupones: SystemLogOrderCoupon[]
  /**
   * Descuentos + impuesto del pedido, materializados por el trigger
   * (`pedidos.descuento_total` / `impuesto_total`). No se recalculan en
   * cliente sumando líneas porque `descuento_total` incluye además los
   * cupones, que no viven en ninguna línea.
   */
  descuentoTotal: number
  impuestoTotal: number
  /** Solo en `modulo === "devoluciones"`. */
  devolucion: {
    numero: string
    motivo: ReturnReason
    /** Lo devuelto, que en una parcial es menos que `total`. */
    totalDevuelto: number
    nota: string | null
  } | null
}

/**
 * Por qué una promoción vigente NO se aplicó a un carrito. No espeja ningún
 * `check` de la base —vive en los `metadatos` del evento, que los escribe el
 * motor— pero sí espeja las columnas que de verdad la descartan:
 * `acumulable`, `modo_multiple`, `limites`, `presupuesto_asignado`,
 * `canal_aplicacion`, `aplica_a_rx` y `monto_minimo_disparo`.
 *
 * Es la respuesta a la única pregunta que el log no podía contestar: «¿por
 * qué no le dio el descuento?». Sin esto, el mostrador y soporte solo pueden
 * comparar la promoción con el ticket a mano y adivinar.
 */
export const EVALUATION_DISCARD_REASONS = [
  "ciclo_incompleto",
  "no_acumulable",
  "menor_beneficio",
  "tope_socio",
  "presupuesto_agotado",
  "fuera_de_vigencia",
  "canal_no_aplica",
  "producto_fuera_universo",
  "monto_minimo_no_alcanzado",
  "rx_no_permitido",
] as const
export type EvaluationDiscardReason =
  (typeof EVALUATION_DISCARD_REASONS)[number]

export const EVALUATION_DISCARD_LABEL: Record<EvaluationDiscardReason, string> =
  {
    ciclo_incompleto: "Todavía no completa el ciclo",
    no_acumulable: "No acumulable con la que se aplicó",
    menor_beneficio: "Daba menos beneficio",
    tope_socio: "Tope del socio alcanzado",
    presupuesto_agotado: "Sin presupuesto",
    fuera_de_vigencia: "Fuera de vigencia",
    canal_no_aplica: "No aplica en este canal",
    producto_fuera_universo: "Ningún producto del carrito califica",
    monto_minimo_no_alcanzado: "No alcanzó el monto mínimo",
    rx_no_permitido: "Producto con receta excluido",
  }

/**
 * Lo que el motor evaluó cuando el carrito preguntó, tal como el POS lo
 * mandó. Sale de los `metadatos` del evento —no de una tabla— y por eso
 * viene todo opcional: los eventos anteriores a que el motor lo escribiera
 * no lo tienen, y rellenarlos con ceros los haría mentir.
 */
export type SystemLogEvaluation = {
  /** El ticket del POS, para poder cruzar con la caja. */
  ticket: string | null
  montoCarrito: number | null
  piezasCarrito: number | null
  /**
   * Las promociones que compitieron por este carrito, la que ganó incluida.
   * Es lo que convierte «no le aplicó» en «no le aplicó porque…».
   */
  candidatas: {
    codigo: string
    aplicada: boolean
    motivo: EvaluationDiscardReason | null
  }[]
}

export type SystemLogEntry = {
  id: string
  modulo: SystemLogModule
  tipo: string
  tipoLabel: string
  severidad: SystemLogSeverity
  titulo: string
  detalle: string | null
  /** La entidad sobre la que ocurrió: la promoción, el lote/cupón o el journey. */
  entidad: string
  entidadHref: string | null
  actor: string
  canal: string | null
  /** Nombre del socio cuando el evento lo tiene — es lo que vuelve auditable una redención puntual. */
  socio: string | null
  /**
   * Su id, para poder filtrar el log por socio. En promociones viene del
   * evento; en cupones, del cupón al que pertenece (`coupon_event` no
   * guarda socio: lo tiene el cupón). Los journeys no lo traen — su ciclo de
   * vida es de la regla, no de una persona.
   */
  socioId: string | null
  motivo: string | null
  metadatos: Record<string, unknown>
  ocurridoEn: string
  /** Solo en `modulo === "promociones"`, y solo si la promoción sigue existiendo. */
  promocion: SystemLogPromotion | null
  /** Solo en `modulo === "compras"` y `"devoluciones"`. */
  compra: SystemLogOrder | null
}
