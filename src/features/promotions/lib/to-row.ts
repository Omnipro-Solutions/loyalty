import { BENEFIT_TYPES_WITH_APPLY_TO, MECHANIC_FIELDS } from "./mechanic-fields"
import type { PromotionValues } from "../schemas"
import type { Json } from "@/types/database.types"

/** Mecánicas donde el beneficio recae sobre un producto puntual, no el carrito completo. */
const PRODUCT_LEVEL_BENEFIT_TYPES = new Set<PromotionValues["benefitType"]>([
  "producto_gratis",
  "precio_fijo_bundle",
  "por_piezas",
])

/**
 * Mapea el formulario a la fila real. Cada columna específica de mecánica se
 * guarda solo si pertenece a `MECHANIC_FIELDS[benefitType]` — si no, se
 * fuerza a `null`. Es el segundo seguro (el primero es que
 * `MechanicPicker.onValueChange` ya limpia el formulario al cambiar de
 * mecánica) contra que queden valores de una mecánica anterior: RHF no
 * desregistra campos de inputs que dejaron de montarse. Movido desde
 * `actions/promotions.ts` porque ese módulo lleva `"use server"` — Next
 * exige que todos sus exports sean funciones async de servidor, así que una
 * función pura como esta no puede vivir (ni exportarse) ahí. La consumen
 * tanto `createPromotionAction`/`updatePromotionAction` como
 * `importPromotionsAction`.
 */
export function toRow(values: PromotionValues) {
  const relevant = new Set(MECHANIC_FIELDS[values.benefitType] ?? [])
  const has = (field: keyof PromotionValues) => relevant.has(field)

  return {
    nombre: values.name,
    codigo: values.code,
    tipo: values.type,
    prioridad: values.priority,
    acumulable: values.stackable,
    canal_aplicacion: values.channelScope,
    condiciones: values.conditions as unknown as Json,
    tipo_beneficio: values.benefitType,
    valor_beneficio: has("benefitValue") ? (values.benefitValue ?? null) : null,
    tope_maximo: has("maxCap") ? (values.maxCap ?? null) : null,
    // `aplicar_sobre` es `not null` en la base — para las mecánicas donde
    // el campo no se muestra, se fuerza el valor correcto en vez de dejar
    // el default genérico "subtotal_carrito" guardado por accidente.
    aplicar_sobre: BENEFIT_TYPES_WITH_APPLY_TO.includes(values.benefitType)
      ? values.applyTo
      : values.benefitType === "envio_gratis"
        ? "envio"
        : PRODUCT_LEVEL_BENEFIT_TYPES.has(values.benefitType)
          ? "producto"
          : "subtotal_carrito",
    // Mismo cast que `condiciones` — sin mapeo de claves porque las
    // claves del jsonb ya están en español (ver schemas.ts).
    escalones: has("discountTiers")
      ? (values.discountTiers as unknown as Json)
      : null,
    umbral_tipo: has("thresholdType") ? values.thresholdType : null,
    modo_calculo: has("tierCalculationMode")
      ? values.tierCalculationMode
      : null,
    compra_cantidad: has("compraCantidad")
      ? (values.compraCantidad ?? null)
      : null,
    paga_cantidad: has("pagaCantidad") ? (values.pagaCantidad ?? null) : null,
    alcance_piezas: has("alcancePiezas")
      ? (values.alcancePiezas ?? null)
      : null,
    descuento_unidad_extra_pct: has("descuentoUnidadExtraPct")
      ? (values.descuentoUnidadExtraPct ?? null)
      : null,
    mezcla_en_universo: has("mezclaEnUniverso")
      ? values.mezclaEnUniverso
      : true,
    producto_comprado_id: has("productoCompradoId")
      ? (values.productoCompradoId ?? null)
      : null,
    producto_regalo_id: has("productoRegaloId")
      ? (values.productoRegaloId ?? null)
      : null,
    cantidad_regalo: has("cantidadRegalo")
      ? (values.cantidadRegalo ?? null)
      : null,
    cantidad_minima_comprada: has("cantidadMinimaComprada")
      ? (values.cantidadMinimaComprada ?? null)
      : null,
    beneficio_sobre_regalo_pct: has("beneficioSobreRegaloPct")
      ? (values.beneficioSobreRegaloPct ?? null)
      : null,
    productos_bundle_ids: has("productosBundleIds")
      ? values.productosBundleIds
      : null,
    multiplicador_puntos: has("multiplicadorPuntos")
      ? (values.multiplicadorPuntos ?? null)
      : null,
    niveles_requeridos:
      has("nivelesRequeridos") && values.nivelesRequeridos.length > 0
        ? values.nivelesRequeridos
        : null,
    modo_resolucion_multiplicador: has("modoResolucionMultiplicador")
      ? values.modoResolucionMultiplicador
      : null,
    tipo_saldo: has("tipoSaldo") ? values.tipoSaldo : "canjeable",
    momento_acreditacion: has("momentoAcreditacion")
      ? values.momentoAcreditacion
      : "inmediato",
    estado_inicial: has("estadoInicial") ? values.estadoInicial : "disponible",
    bono_puntos: has("bonoPuntos") ? (values.bonoPuntos ?? null) : null,
    monto_minimo_disparo: has("montoMinimoDisparo")
      ? (values.montoMinimoDisparo ?? null)
      : null,
    tipo_beneficio_no_transaccional: has("tipoBeneficioNoTransaccional")
      ? values.tipoBeneficioNoTransaccional
      : "envio_gratis",
    validacion_requerida: has("validacionRequerida")
      ? values.validacionRequerida || null
      : null,
    cupo_disponible: has("cupoDisponible")
      ? (values.cupoDisponible ?? null)
      : null,
    registra_uso: has("registraUso") ? values.registraUso : false,
    coupon_batch_id: has("couponBatchId")
      ? (values.couponBatchId ?? null)
      : null,
    motivo_emision: has("motivoEmision")
      ? (values.motivoEmision ?? null)
      : null,
    umbral_puntos: has("umbralPuntos") ? (values.umbralPuntos ?? null) : null,
    duracion_cupon_dias: has("duracionCuponDias")
      ? (values.duracionCuponDias ?? null)
      : null,
    momento_debito_puntos: has("momentoDebitoPuntos")
      ? (values.momentoDebitoPuntos ?? null)
      : null,
    devolucion_si_vence: has("devolucionSiVence")
      ? values.devolucionSiVence
      : false,
    evento_gatillo: has("eventoGatillo")
      ? (values.eventoGatillo ?? null)
      : null,
    momento_resolucion: has("momentoResolucion")
      ? (values.momentoResolucion ?? null)
      : null,
    frecuencia_disparo: has("frecuenciaDisparo")
      ? (values.frecuenciaDisparo ?? null)
      : null,
    requisito_alta: has("requisitoAlta")
      ? (values.requisitoAlta ?? null)
      : null,
    elegible_en_inactividad: has("elegibleEnInactividad")
      ? values.elegibleEnInactividad
      : false,
    precio_promocional: has("precioPromocional")
      ? (values.precioPromocional ?? null)
      : null,
    precio_referencia: has("precioReferencia")
      ? (values.precioReferencia ?? null)
      : null,
    hasta_agotar_existencias: has("hastaAgotarExistencias")
      ? values.hastaAgotarExistencias
      : false,
    respeta_precio_minimo_legal: has("respetaPrecioMinimoLegal")
      ? values.respetaPrecioMinimoLegal
      : true,
    tipo_monedero: has("tipoMonedero") ? values.tipoMonedero : "porcentaje",
    disponibilidad_dias: has("disponibilidadDias")
      ? (values.disponibilidadDias ?? null)
      : null,
    vigencia_saldo_dias: has("vigenciaSaldoDias")
      ? (values.vigenciaSaldoDias ?? null)
      : null,
    monto_minimo_canje: has("montoMinimoCanje")
      ? (values.montoMinimoCanje ?? null)
      : null,
    vigente_desde: values.validFrom,
    vigente_hasta: values.validUntil || null,
    dias_semana: values.daysOfWeek.length > 0 ? values.daysOfWeek : null,
    hora_inicio: values.horaInicio || null,
    hora_fin: values.horaFin || null,
    limites: values.limites as unknown as Json,
    presupuesto_asignado: values.assignedBudget,
    grupo_exclusion: values.exclusionGroup || null,
    modo_multiple: values.stackingMode,
    naturaleza_costo: values.naturalezaCosto,
    financiador: values.financiador,
    // El bloque de proveedor solo existe cuando el financiador es un
    // tercero — con `financiador: "retailer"` se null-ea aunque el
    // formulario los haya llegado a poblar (ej. al volver de "compartido").
    proveedor_id:
      values.financiador === "retailer" ? null : values.proveedorId || null,
    contrato_id:
      values.financiador === "retailer" ? null : values.contratoId || null,
    porcentaje_costo_proveedor:
      values.financiador === "retailer"
        ? null
        : (values.porcentajeCostoProveedor ?? null),
    periodo_liquidacion:
      values.financiador === "retailer"
        ? null
        : (values.periodoLiquidacion ?? null),
    umbral_alerta_presupuesto_pct: values.umbralAlertaPresupuestoPct ?? null,
    autorizacion_venta_bajo_costo: values.autorizacionVentaBajoCosto,
    nivel_aplicacion: values.nivelAplicacion,
    aplica_sobre_precio: values.aplicaSobrePrecio,
    descuento_acumula_puntos: values.descuentoAcumulaPuntos,
    aplica_a_rx: values.aplicaARx,
    aprobacion_regulatoria: values.aprobacionRegulatoria,
    simulacion_ejecutada: values.simulacionEjecutada,
    estado_publicacion: values.publicationStatus,
  }
}
