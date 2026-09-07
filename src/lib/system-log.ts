import {
  type SystemLogEntry,
  type SystemLogModule,
  type SystemLogOrderCoupon,
  type SystemLogOrderLine,
  type SystemLogOrderMember,
  type SystemLogOrderPayment,
  type SystemLogSeverity,
} from "@/config/system-log"
import {
  RETURN_REASON_LABEL,
  RETURN_REASONS_SANITARY,
} from "@/config/return-reason"
import { formatNumber, formatUSD } from "@/lib/format"
import { PUBLICATION_STATUS_LABEL } from "@/lib/publication-status"
import { createClient } from "@/lib/supabase/server"
import type {
  BenefitType,
  ChannelScope,
  PaymentMethod,
  PromotionPublicationStatus,
  PromotionType,
  ReturnReason,
} from "@/types/domain"

export type {
  SystemLogEntry,
  SystemLogModule,
  SystemLogSeverity,
} from "@/config/system-log"

/**
 * Etiquetas y severidad de cada tipo de evento. Duplican las de
 * los mapas de `labels.ts` de cada feature a propósito y no por
 * descuido: `lib` no puede
 * importar de `features` (CLAUDE.md §2), y subir los tres mapas completos a
 * `lib` para que los compartan arrastraría con ellos media capa de dominio
 * de cada módulo. Se copia lo que este log necesita, que es solo el nombre
 * legible y el tono.
 */
/**
 * Espeja el `check` de `promocion_eventos.tipo`
 * (`20260831090000_promociones_journeys_doble_aprobacion.sql`) — los quince,
 * no los nueve del check original: un tipo sin entrada cae al `?? [row.tipo]`
 * del bucle y el badge acaba mostrando el valor crudo de la columna
 * (`aprobacion_solicitada`), que además de feo es el que desbordaba la
 * columna. `pausada` se fue con esa migración: hoy es `inactivada`.
 */
const PROMOTION_EVENTS: Record<string, [string, SystemLogSeverity]> = {
  creada: ["Creada", "info"],
  editada: ["Editada", "info"],
  activada: ["Activada", "exito"],
  inactivada: ["Inactivada", "alerta"],
  finalizada: ["Finalizada", "alerta"],
  presupuesto_incrementado: ["Presupuesto ampliado", "info"],
  presupuesto_agotado: ["Presupuesto agotado", "error"],
  vencida: ["Vencida", "alerta"],
  cancelada: ["Cancelada", "error"],
  canje: ["Canje", "exito"],
  canje_rechazado: ["Canje rechazado", "error"],
  aprobacion_solicitada: ["Aprobación solicitada", "info"],
  aprobacion_concedida: ["Aprobación concedida", "exito"],
  aprobacion_rechazada: ["Aprobación rechazada", "error"],
  aprobacion_retirada: ["Aprobación retirada", "alerta"],
}

const COUPON_EVENTS: Record<string, [string, SystemLogSeverity]> = {
  batch_created: ["Lote creado", "info"],
  authorization_signed: ["Autorización firmada", "info"],
  approval_requested: ["Aprobación solicitada", "info"],
  approval_granted: ["Aprobación concedida", "exito"],
  approval_rejected: ["Aprobación rechazada", "error"],
  approval_revoked: ["Aprobación revocada", "error"],
  approval_withdrawn: ["Aprobación retirada", "alerta"],
  generation_started: ["Generación iniciada", "info"],
  generation_completed: ["Generación completada", "exito"],
  issued: ["Emitido", "info"],
  assigned: ["Asignado", "info"],
  unassigned: ["Desasignado", "alerta"],
  validity_extended: ["Vigencia extendida", "info"],
  redeemed: ["Redimido", "exito"],
  redemption_rejected: ["Redención rechazada", "error"],
  expired: ["Expirado", "alerta"],
  cancelled: ["Cancelado", "error"],
  printed: ["Impreso", "info"],
  exported: ["Exportado", "info"],
}

/**
 * Los cuatro tipos de `points_ledger`. `canje` y `expiracion` restan, así
 * que se leen distinto: un canje es el resultado esperado del programa
 * (éxito), una expiración es valor que el socio perdió sin usarlo (alerta).
 */
const POINTS_EVENTS: Record<string, [string, SystemLogSeverity]> = {
  acumulacion: ["Acumulación", "info"],
  canje: ["Canje de puntos", "exito"],
  expiracion: ["Expiración", "alerta"],
  ajuste: ["Ajuste manual", "info"],
}

/**
 * Una compra no tiene ciclo de vida propio: nace completada. Así que el
 * "tipo" del evento es el estado del pedido, que es lo único que puede
 * cambiar después de la venta — y cuando cambia, cambia porque volvió
 * (devuelto) o porque nunca se entregó (cancelado).
 *
 * `completado` va en `info` y no en `exito` a propósito: es el evento más
 * frecuente del log con diferencia, y pintar de verde media pantalla mata
 * justo la señal que el color tiene que dar.
 */
const ORDER_EVENTS: Record<string, [string, SystemLogSeverity]> = {
  completado: ["Compra", "info"],
  devuelto: ["Compra devuelta", "alerta"],
  cancelado: ["Compra cancelada", "error"],
}

/**
 * Una corrida del builder. `simulacion` y `publicacion` se distinguen porque
 * son cosas distintas: una prueba en el lienzo contra un cohorte de mentira,
 * y la regla corriendo de verdad sobre socios reales.
 */
const RUN_TYPE_LABEL: Record<string, string> = {
  publicacion: "Corrida",
  simulacion: "Simulación",
}

const RUN_SEVERITY: Record<string, SystemLogSeverity> = {
  completado: "exito",
  en_progreso: "info",
  con_errores: "error",
}

const RUN_STATE_DETAIL: Record<string, string> = {
  completado: "Terminó sin errores",
  en_progreso: "Todavía en curso",
  con_errores: "Terminó con errores: hay nodos que no procesaron su cohorte",
}

/**
 * El estado de una regla en las palabras que usa el resto del portal.
 * `PUBLICATION_STATUS_LABEL` es la fuente —promociones y builder comparten
 * ciclo de vida— y el fallback deja pasar cualquier estado que la base
 * acepte y esa tabla todavía no nombre, en vez de romper la fila.
 */
function statusLabel(estado: string): string {
  return (
    PUBLICATION_STATUS_LABEL[estado as keyof typeof PUBLICATION_STATUS_LABEL] ??
    estado
  )
}

const WORKFLOW_STATUS_SEVERITY: Record<string, SystemLogSeverity> = {
  activa: "exito",
  borrador: "info",
  suspendida: "alerta",
  finalizada: "alerta",
  cancelada: "error",
}

/**
 * Aplica el `.eq()` del socio solo si hay socio que filtrar. Se hace con un
 * helper y no con un `if` por consulta porque todas se lanzan dentro del
 * mismo `Promise.all` y encadenar condicionalmente ahí dentro no se lee.
 *
 * Es genérico sobre el builder de PostgREST a propósito: las tablas
 * devuelven tipos de fila distintos y solo comparten el método.
 */
function applyMember<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  column: string,
  memberId?: string
): T {
  return memberId ? query.eq(column, memberId) : query
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * El desglose comercial de una línea de compra, tal como lo devuelve la
 * consulta aparte de `pedido_items`
 * (`20260907190000_pedido_desglose_comercial.sql`).
 */
type OrderLineBreakdown = {
  cantidad: number
  descuento: number
  impuestoTasa: number
  promocion: { id: string; codigo: string; nombre: string } | null
}

/**
 * El IVA CONTENIDO en un importe, no sumado encima: el precio al público ya
 * lo trae dentro, que es por lo que se divide entre (1 + tasa). Es la misma
 * fórmula de la columna generada `pedido_items.impuesto`, repetida aquí
 * porque una devolución devuelve una PARTE de la línea y su impuesto hay que
 * recalcularlo sobre lo que volvió — no se puede leer el de la compra.
 */
function taxWithin(base: number, tasa: number): number {
  if (tasa <= 0 || base <= 0) return 0
  return Math.round(((base * tasa) / (1 + tasa)) * 100) / 100
}

/**
 * Normaliza el detalle embebido de un pedido o de una devolución. Las dos
 * tablas tienen la misma forma —cantidad, subtotal y el producto— porque una
 * devolución es un subconjunto de una compra, así que comparten helper.
 *
 * `breakdown` viene de `pedido_items` en los dos casos: una devolución no
 * tiene promoción ni impuesto propios, hereda los de la línea que devuelve
 * (`devolucion_items.pedido_item_id`). Lo que sí es suyo es la PROPORCIÓN:
 * devolver 1 de 3 cajas devuelve un tercio del descuento y un tercio del
 * IVA, y cobrar el reembolso a precio de lista sería regalar la diferencia.
 */
function orderLines(
  items:
    | readonly {
        id?: string
        pedido_item_id?: string | null
        cantidad: number
        subtotal: number
        precio_unitario?: number
        producto: { sku: string | null; nombre: string } | null
      }[]
    | null
    | undefined,
  breakdown?: Map<string, OrderLineBreakdown>
): SystemLogOrderLine[] {
  return (items ?? []).map((item) => {
    const origen = item.pedido_item_id ?? item.id
    const detalle = origen ? breakdown?.get(origen) : undefined
    // Proporción de la línea original que esta fila representa. En una
    // compra es 1 (la línea es ella misma); en una devolución parcial es lo
    // que volvió sobre lo que se llevó.
    const parte =
      detalle && detalle.cantidad > 0
        ? Math.min(1, item.cantidad / detalle.cantidad)
        : 1
    const descuento = detalle
      ? Math.round(detalle.descuento * parte * 100) / 100
      : 0

    return {
      sku: item.producto?.sku ?? null,
      // Un producto retirado del catálogo no borra la venta: el nombre se dice
      // igual, aunque sea para decir que ya no está.
      nombre: item.producto?.nombre ?? "Producto no disponible",
      cantidad: item.cantidad,
      subtotal: item.subtotal,
      // Se deriva cuando el embed no lo trae en vez de mostrar 0: dividir el
      // subtotal es exactamente lo que hace a mano quien lee la fila.
      precioUnitario:
        item.precio_unitario ??
        (item.cantidad > 0 ? item.subtotal / item.cantidad : 0),
      promocion: detalle?.promocion ?? null,
      descuento,
      impuestoTasa: detalle?.impuestoTasa ?? 0,
      impuesto: taxWithin(
        item.subtotal - descuento,
        detalle?.impuestoTasa ?? 0
      ),
    }
  })
}

/**
 * El socio tal como lo necesita el modal de detalle: quién es y con qué se
 * lo identifica en el mostrador. `nombre` y `apellido` van juntos porque en
 * la fila del log solo cabe el nombre, pero en el detalle se pide el
 * completo — y el documento es lo que se compara contra la credencial.
 */
function orderMember(
  memberId: string | null,
  socio:
    | {
        nombre: string
        apellido?: string | null
        email?: string | null
        telefono?: string | null
        tipo_documento?: string | null
        numero_documento?: string | null
        nivel?: { nombre: string } | null
      }
    | null
    | undefined
): SystemLogOrderMember | null {
  if (!memberId || !socio) return null
  const documento =
    socio.numero_documento && socio.tipo_documento
      ? `${socio.tipo_documento.toUpperCase()} ${socio.numero_documento}`
      : (socio.numero_documento ?? null)
  return {
    id: memberId,
    nombre: [socio.nombre, socio.apellido].filter(Boolean).join(" ").trim(),
    email: socio.email ?? null,
    telefono: socio.telefono ?? null,
    documento,
    nivel: socio.nivel?.nombre ?? null,
  }
}

/** Piezas, no líneas: es la unidad con la que cuentan las mecánicas 3x2. */
function countPieces(lineas: SystemLogOrderLine[]): number {
  return lineas.reduce((sum, linea) => sum + linea.cantidad, 0)
}

function piecesLabel(piezas: number): string {
  return `${formatNumber(piezas)} pieza${piezas === 1 ? "" : "s"}`
}

function str(record: Record<string, unknown>, key: string): string | null {
  const v = record[key]
  return typeof v === "string" && v !== "" ? v : null
}

/**
 * La bitácora de todo el sistema en un solo hilo cronológico. Antes cada
 * módulo tenía la suya y no había ninguna pantalla desde la que ver qué
 * pasó, sin más: un canje de promoción pagado con un cupón que un journey
 * emitió son tres eventos del mismo hecho, y separados en tres pantallas
 * nadie los reconstruye.
 *
 * Se consultan las seis fuentes en paralelo, se normalizan a una fila común
 * y se ordenan en memoria. Es correcto a la escala de este proyecto (unos
 * miles de filas) y evita una vista SQL que habría que mantener en paralelo
 * al esquema de los seis módulos; con volumen de producción esto pediría
 * una vista materializada o una tabla de log propia.
 */
export async function listSystemEvents(
  modulos: SystemLogModule[] = [],
  limit = 300,
  /**
   * Acota el log a un socio. Se filtra en SQL y no en memoria porque el
   * límite de filas se aplica ANTES: pedir las últimas 300 de toda la
   * organización y quedarse con las de una persona devolvería casi siempre
   * cero, aunque esa persona tenga cien eventos.
   *
   * `journeys` queda fuera por definición: ni el ciclo de vida de una regla
   * ni sus corridas son de nadie en particular — una corrida es de la regla,
   * sobre un cohorte.
   */
  memberId?: string
): Promise<SystemLogEntry[]> {
  const supabase = await createClient()
  const wants = (m: SystemLogModule) =>
    (modulos.length === 0 || modulos.includes(m)) &&
    (!memberId || m !== "journeys")

  /**
   * El embed del cupón cambia de tipo de join según se filtre o no por socio,
   * y no es un detalle: PostgREST hace LEFT JOIN por defecto, así que
   * `.eq("coupon.member_id", …)` filtraba las filas EMBEBIDAS pero no las del
   * evento — el log de un socio se llenaba de eventos de cupón de otras
   * personas, con la entidad vacía. Con `!inner` el filtro sí sube al padre.
   *
   * Y no se puede dejar `!inner` siempre: los eventos de LOTE (creado,
   * aprobación concedida, generación completada) no tienen `coupon_id`, así
   * que un inner join los borraría del log general, que es donde más se leen.
   */
  const couponJoin = memberId
    ? "coupon:coupon!inner(code, member_id, socio:members!member_id(nombre))"
    : "coupon:coupon!coupon_id(code, member_id, socio:members!member_id(nombre))"

  const [
    orderEvents,
    returnEvents,
    promoEvents,
    couponEvents,
    pointsEvents,
    runEvents,
    workflowEvents,
  ] = await Promise.all([
    wants("compras")
      ? applyMember(
          supabase
            .from("pedidos")
            .select(
              `id, numero_pedido, canal, estado, total, creado_en, member_id,
               socio:members!member_id(
                 nombre, apellido, email, telefono, tipo_documento,
                 numero_documento, nivel:tiers!tier_id(nombre)
               ),
               tienda:tiendas!tienda_id(nombre),
               items:pedido_items(
                 id, cantidad, subtotal, precio_unitario,
                 producto:productos!producto_id(sku, nombre)
               )`
            )
            .order("creado_en", { ascending: false })
            .limit(limit),
          "member_id",
          memberId
        )
      : Promise.resolve({ data: [], error: null }),
    wants("devoluciones")
      ? applyMember(
          supabase
            .from("devoluciones")
            .select(
              `id, numero_devolucion, motivo, nota, canal, total_devuelto,
               creado_en, member_id, pedido_id,
               socio:members!member_id(
                 nombre, apellido, email, telefono, tipo_documento,
                 numero_documento, nivel:tiers!tier_id(nombre)
               ),
               tienda:tiendas!tienda_id(nombre),
               actor:profiles!registrado_por(nombre),
               pedido:pedidos!pedido_id(numero_pedido, total, estado, creado_en),
               items:devolucion_items(
                 pedido_item_id, cantidad, subtotal, precio_unitario,
                 producto:productos!producto_id(sku, nombre)
               )`
            )
            .order("creado_en", { ascending: false })
            .limit(limit),
          "member_id",
          memberId
        )
      : Promise.resolve({ data: [], error: null }),
    wants("promociones")
      ? applyMember(
          supabase
            .from("promocion_eventos")
            .select(
              `id, tipo, titulo, detalle, actor_etiqueta, canal, codigo_motivo,
             nota_motivo, metadatos, ocurrido_en,
             promocion:promociones!promocion_id(
               id, nombre, codigo, tipo, estado_publicacion, canal_aplicacion,
               vigente_desde, vigente_hasta, presupuesto_asignado,
               presupuesto_consumido, canjes, tipo_beneficio,
               compra_cantidad, paga_cantidad
             ),
             member_id,
             socio:members!member_id(nombre)`
            )
            .order("ocurrido_en", { ascending: false })
            .limit(limit),
          "member_id",
          memberId
        )
      : Promise.resolve({ data: [], error: null }),
    wants("cupones")
      ? applyMember(
          supabase
            .from("coupon_event")
            .select(
              `id, type, title, detail, actor_label, reason_code, reason_note,
             metadata, occurred_at,
             ${couponJoin},
             batch:coupon_batch!batch_id(id, reference, name)`
            )
            .order("occurred_at", { ascending: false })
            .limit(limit),
          "coupon.member_id",
          memberId
        )
      : Promise.resolve({ data: [], error: null }),
    wants("puntos")
      ? applyMember(
          supabase
            .from("points_ledger")
            .select(
              `id, tipo, puntos, canal, origen, creado_en, expira_en,
               member_id, workflow_run_id,
               socio:members!member_id(nombre),
               actor:profiles!aplicado_por(nombre)`
            )
            .order("creado_en", { ascending: false })
            .limit(limit),
          "member_id",
          memberId
        )
      : Promise.resolve({ data: [], error: null }),
    wants("journeys")
      ? supabase
          .from("workflow_runs")
          .select(
            `id, workflow_version, tipo, estado, resumen, iniciado_en,
             finalizado_en,
             workflow:workflows!workflow_id(id, nombre)`
          )
          .order("iniciado_en", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null }),
    wants("journeys")
      ? supabase
          .from("workflow_status_events")
          .select(
            `id, estado_anterior, estado_nuevo, codigo_motivo, nota, ocurrido_en,
             workflow:workflows!workflow_id(id, nombre),
             actor:profiles!actor_id(nombre)`
          )
          .order("ocurrido_en", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (orderEvents.error) throw orderEvents.error
  if (promoEvents.error) throw promoEvents.error
  if (couponEvents.error) throw couponEvents.error
  // Mismo criterio que el builder: `devoluciones` es una tabla nueva
  // (20260907090000). Si la migración no está aplicada, el log se queda sin
  // ese módulo en vez de dejar la pantalla en blanco.
  const returnRows = returnEvents.error ? [] : (returnEvents.data ?? [])
  // Mismo criterio de degradación que el ciclo de vida: si `workflow_runs`
  // falla, el log pierde las corridas y no la pantalla.
  const runRows = runEvents.error ? [] : (runEvents.data ?? [])
  // El ciclo de vida del builder es opcional: `workflow_status_events` solo
  // existe tras migrar (ver `hasStatusEventsTable` en el builder). Si falta,
  // el log se queda sin ese módulo en vez de reventar entero.
  const workflowRows = workflowEvents.error ? [] : (workflowEvents.data ?? [])

  /**
   * Los medios de pago, en su propia consulta y no como embed de `pedidos`.
   *
   * Dos razones. Una: `pedido_pagos` es una tabla nueva
   * (`20260907180000_pedido_pagos.sql`) y un embed a una tabla que no existe
   * hace fallar la consulta ENTERA — el log se quedaría sin el módulo de
   * Compras por una migración sin aplicar. Aquí, si falla, lo único que se
   * pierde es la sección "Cómo se pagó" del modal (mismo criterio de
   * degradación que `devoluciones` y `workflow_status_events`). Y dos: una
   * devolución necesita los pagos de la compra ORIGINAL, así que la clave es
   * el `pedido_id`, no la fila del evento.
   *
   * Va después del `Promise.all` porque los ids salen de él: es un viaje
   * extra, sobre una lista ya acotada por el `limit` del log.
   */
  const pedidoIds = [
    ...new Set([
      ...(orderEvents.data ?? []).map((row) => row.id),
      ...returnRows
        .map((row) => row.pedido_id)
        .filter((id): id is string => !!id),
    ]),
  ]

  const paymentsByOrder = new Map<string, SystemLogOrderPayment[]>()
  if (pedidoIds.length > 0) {
    const { data: paymentRows, error: paymentsError } = await supabase
      .from("pedido_pagos")
      .select("pedido_id, metodo, importe, puntos, referencia")
      .in("pedido_id", pedidoIds)
    if (!paymentsError) {
      for (const row of paymentRows ?? []) {
        const list = paymentsByOrder.get(row.pedido_id) ?? []
        list.push({
          metodo: row.metodo as PaymentMethod,
          importe: row.importe,
          puntos: row.puntos,
          referencia: row.referencia,
        })
        paymentsByOrder.set(row.pedido_id, list)
      }
    }
  }

  /**
   * El desglose comercial de cada línea —promoción, descuento, tasa de IVA—
   * y los cupones del pedido, en dos consultas aparte por la misma razón que
   * los pagos: son columnas y filas de una migración nueva
   * (`20260907190000_pedido_desglose_comercial.sql`), y pedirlas dentro del
   * `select` de `pedidos` haría fallar la consulta ENTERA si todavía no está
   * aplicada. Aquí lo único que se pierde es el desglose del modal.
   *
   * Se cruzan por `pedido_items.id` y no por producto: una devolución
   * referencia la LÍNEA que devuelve (`devolucion_items.pedido_item_id`), y
   * el mismo producto puede aparecer en dos pedidos distintos del lote.
   */
  const breakdownByItem = new Map<string, OrderLineBreakdown>()
  const couponsByOrder = new Map<string, SystemLogOrderCoupon[]>()
  if (pedidoIds.length > 0) {
    const [lineBreakdown, redemptions] = await Promise.all([
      supabase
        .from("pedido_items")
        .select(
          `id, cantidad, descuento, impuesto_tasa, promocion_id,
           promocion:promociones!promocion_id(codigo, nombre)`
        )
        .in("pedido_id", pedidoIds),
      supabase
        .from("coupon_redemption")
        .select(
          `pedido_id, discount_applied, result,
           cupon:coupon!coupon_id(code, discount_type, discount_value)`
        )
        .in("pedido_id", pedidoIds)
        .eq("result", "applied"),
    ])

    if (!lineBreakdown.error) {
      for (const row of lineBreakdown.data ?? []) {
        breakdownByItem.set(row.id, {
          cantidad: row.cantidad,
          descuento: row.descuento,
          impuestoTasa: row.impuesto_tasa,
          promocion:
            row.promocion_id && row.promocion
              ? {
                  id: row.promocion_id,
                  codigo: row.promocion.codigo,
                  nombre: row.promocion.nombre,
                }
              : null,
        })
      }
    }

    if (!redemptions.error) {
      for (const row of redemptions.data ?? []) {
        if (!row.pedido_id || !row.cupon) continue
        const list = couponsByOrder.get(row.pedido_id) ?? []
        list.push({
          codigo: row.cupon.code,
          tipoDescuento: row.cupon.discount_type,
          valor: row.cupon.discount_value,
          descuento: row.discount_applied ?? 0,
        })
        couponsByOrder.set(row.pedido_id, list)
      }
    }
  }

  /**
   * Lo que el pedido descontó y el IVA que lleva dentro, sumados aquí y no
   * leídos de `pedidos.descuento_total`: esas dos columnas también son de la
   * migración nueva y pedirlas rompería la consulta principal. La suma da lo
   * mismo —el trigger calcula exactamente esto— y degrada a 0.
   */
  function orderTotals(
    lineas: SystemLogOrderLine[],
    cupones: SystemLogOrderCoupon[]
  ) {
    const descuentoLineas = lineas.reduce((sum, l) => sum + l.descuento, 0)
    const descuentoCupones = cupones.reduce((sum, c) => sum + c.descuento, 0)
    return {
      descuentoTotal:
        Math.round((descuentoLineas + descuentoCupones) * 100) / 100,
      impuestoTotal:
        Math.round(lineas.reduce((sum, l) => sum + l.impuesto, 0) * 100) / 100,
    }
  }

  const entries: SystemLogEntry[] = []

  /**
   * Las compras, que son el hecho del que cuelga todo lo demás. El total va
   * en la descripción y no en la entidad porque la entidad es el
   * identificador (`PED-…`): es lo que se busca cuando alguien llega al
   * mostrador con un recibo en la mano.
   */
  for (const row of orderEvents.data ?? []) {
    const [label, severidad] = ORDER_EVENTS[row.estado] ?? ["Compra", "info"]
    const lineas = orderLines(row.items, breakdownByItem)
    const piezas = countPieces(lineas)
    const cupones = couponsByOrder.get(row.id) ?? []
    const totales = orderTotals(lineas, cupones)
    entries.push({
      id: `pedido:${row.id}`,
      modulo: "compras",
      promocion: null,
      tipo: row.estado,
      tipoLabel: label,
      severidad,
      entidad: row.numero_pedido,
      // No hay pantalla de pedido en el portal; el destino útil es la ficha
      // del socio, que es donde se ve lo que esta compra desencadenó.
      entidadHref: row.member_id ? `/clientes/${row.member_id}` : null,
      titulo: `${formatUSD(row.total)} · ${piecesLabel(piezas)} en ${lineas.length} producto${lineas.length === 1 ? "" : "s"}`,
      detalle: null,
      actor: row.tienda?.nombre ?? "Canal digital",
      canal: row.canal,
      socio: row.socio?.nombre ?? null,
      socioId: row.member_id,
      motivo: null,
      metadatos: {},
      ocurridoEn: row.creado_en,
      compra: {
        numeroPedido: row.numero_pedido,
        canal: row.canal,
        tienda: row.tienda?.nombre ?? null,
        estado: row.estado,
        fecha: row.creado_en,
        socio: orderMember(row.member_id, row.socio),
        pagos: paymentsByOrder.get(row.id) ?? [],
        total: row.total,
        piezas,
        lineas,
        cupones,
        ...totales,
        devolucion: null,
      },
    })
  }

  /**
   * Las devoluciones. El tipo del evento es el MOTIVO —no un genérico
   * "Devolución"— porque es lo único que cambia la decisión de quien lee: un
   * cambio de decisión es caja, una reacción adversa es
   * farmacovigilancia. Por eso esos dos suben a `error` mientras el resto se
   * queda en `alerta`.
   */
  for (const row of returnRows) {
    const motivo = row.motivo as ReturnReason
    // El desglose de las líneas devueltas sale de la COMPRA, prorrateado por
    // lo que volvió: una devolución no tiene promoción ni IVA propios.
    const lineas = orderLines(row.items, breakdownByItem)
    const piezas = countPieces(lineas)
    // Los cupones son los de la compra original, igual que los pagos: es
    // contra ese ticket contra el que se hace el reembolso.
    const cupones = row.pedido_id
      ? (couponsByOrder.get(row.pedido_id) ?? [])
      : []
    entries.push({
      id: `devolucion:${row.id}`,
      modulo: "devoluciones",
      promocion: null,
      tipo: motivo,
      tipoLabel: RETURN_REASON_LABEL[motivo] ?? "Devolución",
      severidad: RETURN_REASONS_SANITARY.includes(motivo) ? "error" : "alerta",
      entidad: row.numero_devolucion,
      entidadHref: row.member_id ? `/clientes/${row.member_id}` : null,
      titulo: `−${formatUSD(row.total_devuelto)} · ${piecesLabel(piezas)} de ${row.pedido?.numero_pedido ?? "su compra"}`,
      detalle: row.nota,
      actor: row.actor?.nombre ?? row.tienda?.nombre ?? "Mostrador",
      canal: row.canal,
      socio: row.socio?.nombre ?? null,
      socioId: row.member_id,
      motivo: null,
      metadatos: {},
      ocurridoEn: row.creado_en,
      compra: {
        numeroPedido: row.pedido?.numero_pedido ?? "—",
        canal: row.canal,
        tienda: row.tienda?.nombre ?? null,
        estado: row.pedido?.estado ?? null,
        fecha: row.pedido?.creado_en ?? null,
        socio: orderMember(row.member_id, row.socio),
        // Los de la compra original: un reembolso vuelve por el mismo medio
        // con el que se pagó, y ese dato no está en la devolución.
        pagos: row.pedido_id ? (paymentsByOrder.get(row.pedido_id) ?? []) : [],
        total: row.pedido?.total ?? row.total_devuelto,
        piezas,
        lineas,
        cupones,
        /* Los totales de lo DEVUELTO, no los de la compra: es la cifra que
           decide el reembolso. El cupón queda FUERA de la resta a propósito
           —se muestra como contexto de la compra, no se descuenta— porque
           descontó sobre el pedido completo y nada dice qué parte tocaba a
           las líneas que volvieron. Restarlo entero devolvería de menos en
           una devolución parcial. */
        ...orderTotals(lineas, []),
        devolucion: {
          numero: row.numero_devolucion,
          motivo,
          totalDevuelto: row.total_devuelto,
          nota: row.nota,
        },
      },
    })
  }

  for (const row of promoEvents.data ?? []) {
    const [label, severidad] = PROMOTION_EVENTS[row.tipo] ?? [row.tipo, "info"]
    entries.push({
      id: `promo:${row.id}`,
      modulo: "promociones",
      compra: null,
      tipo: row.tipo,
      tipoLabel: label,
      severidad,
      titulo: row.titulo,
      detalle: row.detalle,
      entidad: row.promocion?.nombre ?? "—",
      entidadHref: row.promocion?.id
        ? `/promociones/${row.promocion.id}/editar`
        : null,
      actor: row.actor_etiqueta,
      canal: row.canal,
      socio: row.socio?.nombre ?? null,
      socioId: row.member_id,
      motivo: row.nota_motivo ?? row.codigo_motivo,
      metadatos: asRecord(row.metadatos),
      ocurridoEn: row.ocurrido_en,
      promocion: row.promocion
        ? {
            codigo: row.promocion.codigo,
            tipo: row.promocion.tipo as PromotionType,
            tipoBeneficio: row.promocion.tipo_beneficio as BenefitType,
            compraCantidad: row.promocion.compra_cantidad,
            pagaCantidad: row.promocion.paga_cantidad,
            estadoPublicacion: row.promocion
              .estado_publicacion as PromotionPublicationStatus,
            canal: row.promocion.canal_aplicacion as ChannelScope,
            vigenteDesde: row.promocion.vigente_desde,
            vigenteHasta: row.promocion.vigente_hasta,
            presupuestoAsignado: row.promocion.presupuesto_asignado,
            presupuestoConsumido: row.promocion.presupuesto_consumido,
            canjes: row.promocion.canjes,
          }
        : null,
    })
  }

  for (const row of couponEvents.data ?? []) {
    const [label, severidad] = COUPON_EVENTS[row.type] ?? [row.type, "info"]
    const metadata = asRecord(row.metadata)
    entries.push({
      id: `coupon:${row.id}`,
      modulo: "cupones",
      promocion: null,
      compra: null,
      tipo: row.type,
      tipoLabel: label,
      severidad,
      titulo: row.title,
      detalle: row.detail,
      // El cupón individual es más específico que el lote, así que gana
      // cuando el evento tiene los dos.
      entidad:
        row.coupon?.code ?? row.batch?.name ?? row.batch?.reference ?? "—",
      entidadHref: row.batch?.id ? `/cupones/${row.batch.id}` : null,
      actor: row.actor_label,
      canal: str(metadata, "canal"),
      // El evento del cupón no guarda socio; lo guarda el cupón. Sin este
      // salto, un canje no se podría atribuir a nadie en el log.
      socio: row.coupon?.socio?.nombre ?? null,
      socioId: row.coupon?.member_id ?? null,
      motivo: row.reason_note ?? row.reason_code,
      metadatos: metadata,
      ocurridoEn: row.occurred_at,
    })
  }

  for (const row of pointsEvents.error ? [] : (pointsEvents.data ?? [])) {
    const [label, severidad] = POINTS_EVENTS[row.tipo] ?? [row.tipo, "info"]
    const signo = row.puntos > 0 ? "+" : ""
    entries.push({
      id: `points:${row.id}`,
      modulo: "puntos",
      promocion: null,
      compra: null,
      tipo: row.tipo,
      tipoLabel: label,
      severidad,
      // El delta ES el evento, así que va donde más se lee: en la entidad.
      // El saldo resultante NO se muestra — solo es cierto en la serie
      // completa de una persona, y aquí se filtra y se corta (ver el
      // comentario de `SYSTEM_LOG_MODULES`).
      entidad: `${signo}${String(row.puntos)} pts`,
      entidadHref: row.member_id ? `/clientes/${row.member_id}` : null,
      titulo: row.origen ?? label,
      detalle: row.expira_en
        ? `Vencen el ${new Date(row.expira_en).toLocaleDateString("es-CO")}`
        : null,
      actor: row.actor?.nombre ?? "Motor de lealtad",
      canal: row.canal,
      socio: row.socio?.nombre ?? null,
      socioId: row.member_id,
      motivo: null,
      metadatos: row.workflow_run_id
        ? { workflow_run_id: row.workflow_run_id }
        : {},
      ocurridoEn: row.creado_en,
    })
  }

  /**
   * Las corridas de las reglas. Cierran una promesa que el docstring de
   * `SYSTEM_LOG_MODULES` ya hacía —«journeys une el ciclo de vida del
   * workflow con sus corridas»— y que el log no cumplía: leía solo
   * `workflow_status_events`, así que la bitácora mostraba dos cambios de
   * estado mientras 28 ejecuciones quedaban fuera. Una regla que se activó y
   * nunca corrió, y una que corre cada noche, se veían exactamente igual.
   *
   * No llevan socio: una corrida es de la regla, sobre un cohorte. Por eso
   * comparten módulo con el ciclo de vida y quedan fuera del log acotado a
   * una persona (ver `wants`).
   */
  for (const row of runRows) {
    const resumen = asRecord(row.resumen)
    const pasos = Array.isArray(resumen.steps) ? resumen.steps.length : null
    const cohorte =
      typeof resumen.initialCohort === "number" ? resumen.initialCohort : null

    entries.push({
      id: `run:${row.id}`,
      modulo: "journeys",
      promocion: null,
      compra: null,
      tipo: row.tipo,
      tipoLabel: RUN_TYPE_LABEL[row.tipo] ?? "Corrida",
      severidad: RUN_SEVERITY[row.estado] ?? "info",
      entidad: row.workflow?.nombre ?? "—",
      // A la analítica de la regla y no al editor: es la pantalla que
      // desglosa esta corrida nodo por nodo.
      entidadHref: row.workflow?.id
        ? `/journeys/${row.workflow.id}/analitica`
        : null,
      titulo: [
        cohorte !== null ? `${formatNumber(cohorte)} en el cohorte` : null,
        pasos !== null
          ? `${String(pasos)} paso${pasos === 1 ? "" : "s"}`
          : null,
        `v${String(row.workflow_version)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      detalle: RUN_STATE_DETAIL[row.estado] ?? null,
      actor: "Motor de lealtad",
      canal: null,
      socio: null,
      socioId: null,
      motivo: null,
      // El `resumen` completo es un árbol de nodos: aplanado no se lee, y
      // crudo tampoco. Lo que cabe en la rejilla de metadatos son las cifras.
      metadatos: {
        estado: row.estado,
        version: row.workflow_version,
        ...(cohorte !== null ? { cohorte_inicial: cohorte } : {}),
        ...(pasos !== null ? { pasos } : {}),
      },
      ocurridoEn: row.iniciado_en,
    })
  }

  for (const row of workflowRows) {
    entries.push({
      id: `journey:${row.id}`,
      modulo: "journeys",
      promocion: null,
      compra: null,
      tipo: row.estado_nuevo,
      // El badge lleva el estado al que se LLEGÓ, no la transición entera:
      // era el único evento del log que pegaba dos valores crudos de la base
      // (`borrador → pendiente_aprobacion`) en una celda de 150px. De dónde
      // venía se lee en la descripción, que tiene el ancho para decirlo.
      tipoLabel: statusLabel(row.estado_nuevo),
      severidad: WORKFLOW_STATUS_SEVERITY[row.estado_nuevo] ?? "info",
      titulo: `${statusLabel(row.estado_anterior)} → ${statusLabel(row.estado_nuevo)}`,
      detalle: row.nota,
      entidad: row.workflow?.nombre ?? "—",
      entidadHref: row.workflow?.id ? `/journeys/${row.workflow.id}` : null,
      actor: row.actor?.nombre ?? "Sistema",
      canal: null,
      socio: null,
      socioId: null,
      motivo: row.codigo_motivo,
      metadatos: {
        estado_anterior: row.estado_anterior,
        estado_nuevo: row.estado_nuevo,
      },
      ocurridoEn: row.ocurrido_en,
    })
  }

  return entries
    .sort(
      (a, b) =>
        new Date(b.ocurridoEn).getTime() - new Date(a.ocurridoEn).getTime()
    )
    .slice(0, limit)
}

/** Nombre del socio al que está acotado el log, para poder decirlo en pantalla. */
export async function getMemberName(memberId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("members")
    .select("nombre")
    .eq("id", memberId)
    .maybeSingle()
  return data?.nombre ?? null
}
