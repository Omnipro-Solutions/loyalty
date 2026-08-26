import { BENEFIT_TYPES_WITH_APPLY_TO, MECHANIC_FIELDS } from "./mechanic-fields"
import type { PromotionValues } from "../schemas"
import type { Json } from "@/types/database.types"

/** Mecánicas donde el beneficio recae sobre un producto puntual, no el carrito completo. */
const PRODUCT_LEVEL_BENEFIT_TYPES = new Set<PromotionValues["benefitType"]>([
  "producto_gratis",
  "precio_fijo_bundle",
  "por_piezas",
  "descuento_continuidad",
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
  /** Columna específica de mecánica: el valor del formulario si aplica a esta mecánica, si no el fallback (por defecto `null`). */
  const pick = <K extends keyof PromotionValues, F = null>(
    field: K,
    fallback: F = null as F
  ): NonNullable<PromotionValues[K]> | F =>
    has(field) ? (values[field] ?? fallback) : fallback

  return {
    nombre: values.name,
    codigo: values.code,
    tipo: values.type,
    prioridad: values.priority,
    acumulable: values.stackable,
    canal_aplicacion: values.channelScope,
    condiciones: values.conditions as unknown as Json,
    tipo_beneficio: values.benefitType,
    valor_beneficio: pick("benefitValue"),
    tope_maximo: pick("maxCap"),
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
    escalones: pick("discountTiers") as unknown as Json,
    umbral_tipo: pick("thresholdType"),
    modo_calculo: pick("tierCalculationMode"),
    compra_cantidad: pick("compraCantidad"),
    paga_cantidad: pick("pagaCantidad"),
    alcance_piezas: pick("alcancePiezas"),
    descuento_unidad_extra_pct: pick("descuentoUnidadExtraPct"),
    mezcla_en_universo: pick("mezclaEnUniverso", true),
    producto_comprado_id: pick("productoCompradoId"),
    producto_regalo_id: pick("productoRegaloId"),
    cantidad_regalo: pick("cantidadRegalo"),
    cantidad_minima_comprada: pick("cantidadMinimaComprada"),
    beneficio_sobre_regalo_pct: pick("beneficioSobreRegaloPct"),
    productos_bundle_ids: pick("productosBundleIds"),
    multiplicador_puntos: pick("multiplicadorPuntos"),
    niveles_requeridos:
      has("nivelesRequeridos") && values.nivelesRequeridos.length > 0
        ? values.nivelesRequeridos
        : null,
    modo_resolucion_multiplicador: pick("modoResolucionMultiplicador"),
    tipo_saldo: pick("tipoSaldo", "canjeable"),
    momento_acreditacion: pick("momentoAcreditacion", "inmediato"),
    estado_inicial: pick("estadoInicial", "disponible"),
    bono_puntos: pick("bonoPuntos"),
    monto_minimo_disparo: pick("montoMinimoDisparo"),
    tipo_beneficio_no_transaccional: pick(
      "tipoBeneficioNoTransaccional",
      "envio_gratis"
    ),
    validacion_requerida: has("validacionRequerida")
      ? values.validacionRequerida || null
      : null,
    cupo_disponible: pick("cupoDisponible"),
    registra_uso: pick("registraUso", false),
    coupon_batch_id: pick("couponBatchId"),
    motivo_emision: pick("motivoEmision"),
    umbral_puntos: pick("umbralPuntos"),
    duracion_cupon_dias: pick("duracionCuponDias"),
    momento_debito_puntos: pick("momentoDebitoPuntos"),
    devolucion_si_vence: pick("devolucionSiVence", false),
    evento_gatillo: pick("eventoGatillo"),
    momento_resolucion: pick("momentoResolucion"),
    frecuencia_disparo: pick("frecuenciaDisparo"),
    requisito_alta: pick("requisitoAlta"),
    elegible_en_inactividad: pick("elegibleEnInactividad", false),
    precio_promocional: pick("precioPromocional"),
    precio_referencia: pick("precioReferencia"),
    hasta_agotar_existencias: pick("hastaAgotarExistencias", false),
    respeta_precio_minimo_legal: pick("respetaPrecioMinimoLegal", true),
    tipo_monedero: pick("tipoMonedero", "porcentaje"),
    disponibilidad_dias: pick("disponibilidadDias"),
    vigencia_saldo_dias: pick("vigenciaSaldoDias"),
    monto_minimo_canje: pick("montoMinimoCanje"),
    ventana_continuidad_dias: pick("ventanaContinuidadDias"),
    al_romper_continuidad: pick("alRomperContinuidad"),
    acumula_retroactivo: pick("acumulaRetroactivo", false),
    efecto_devolucion: pick("efectoDevolucion"),
    criterio_seleccion_piezas: pick("criterioSeleccionPiezas"),
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
    nivel_aplicacion: values.nivelAplicacion,
    aplica_sobre_precio: values.aplicaSobrePrecio,
    descuento_acumula_puntos: values.descuentoAcumulaPuntos,
    aplica_a_rx: values.aplicaARx,
    aprobacion_regulatoria: values.aprobacionRegulatoria,
    estado_publicacion: values.publicationStatus,
  }
}
