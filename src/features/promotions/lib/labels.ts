import { formatUSD } from "@/lib/format"
import type {
  AccrualTiming,
  ApplicationLevel,
  ChannelScope,
  ApplyTo,
  BalanceInitialState,
  BalanceType,
  BxgyScope,
  ConditionField,
  ConditionCombinator,
  CostNature,
  BenefitType,
  DayOfWeek,
  DiscountTierCalculationMode,
  DiscountTierThresholdType,
  EnrollmentRequirement,
  Financiador,
  LimitExcessBehavior,
  LimitSubject,
  LimitUnit,
  LimitWindow,
  MultiplierResolutionMode,
  NonTransactionalBenefitType,
  PointsDebitTiming,
  PriceBasis,
  PromotionType,
  RxApplicability,
  SettlementPeriod,
  StackingMode,
  TierName,
  TriggerEvent,
  TriggerFrequency,
  TriggerResolutionMoment,
  WalletValueType,
} from "@/types/domain"

/** Igual que `features/team` `CHANNEL_SCOPE_LABEL` — duplicado a propósito (features aisladas, CLAUDE.md §2). */
export const CHANNEL_SCOPE_LABEL: Record<ChannelScope, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  pos_ecommerce: "POS + E-commerce",
}

/** Prefijo del subtítulo en 06.1 ("Cantidad · todas las tiendas", "Cupón · nuevos clientes"…). */
export const PROMOTION_TYPE_LABEL: Record<PromotionType, string> = {
  cantidad: "Cantidad",
  categoria: "Categoría",
  segmento: "Segmento",
  carrito: "Carrito",
  cupon: "Cupón",
  bundle: "Bundle",
}

export const CONDITION_FIELD_LABEL: Record<ConditionField, string> = {
  categoria: "Categoría del producto",
  tienda: "Tienda",
  segmento: "Segmento del cliente",
  monto_carrito: "Monto del carrito",
  cupon_codigo: "Código de cupón",
}

/** Operador implícito por campo (07.1: cada campo del mock trae siempre el mismo operador). */
export const CONDITION_FIELD_OPERATOR: Record<ConditionField, string> = {
  categoria: "pertenece a",
  tienda: "está en",
  segmento: "es igual a",
  monto_carrito: "mayor o igual a",
  cupon_codigo: "coincide con",
}

/** Frase larga del selector de cabecera de un grupo (Figma "Regla del grupo": "...cumple [todas las condiciones ▾]" / "...si cumple [al menos una ▾]"). */
export const CONDITION_COMBINATOR_LABEL: Record<ConditionCombinator, string> = {
  todas: "todas las condiciones",
  alguna: "al menos una",
}

/** Píldora corta entre condiciones hermanas de un mismo grupo (Figma "Conector Y"/"Conector O"). */
export const CONDITION_COMBINATOR_CONNECTOR_LABEL: Record<
  ConditionCombinator,
  string
> = {
  todas: "Y",
  alguna: "O",
}

export const BENEFIT_TYPE_LABEL: Record<BenefitType, string> = {
  descuento_porcentual: "Descuento porcentual",
  descuento_monto_fijo: "Descuento de monto fijo",
  envio_gratis: "Envío gratis",
  producto_gratis: "Producto gratis (2x1, 3x2…)",
  precio_fijo_bundle: "Precio fijo de bundle",
  descuento_escalonado: "Descuento escalonado",
  por_piezas: "Por piezas (BxGy)",
  multiplicador_puntos: "Multiplicador de puntos",
  bono_puntos: "Bono de puntos",
  emitir_cupon: "Emitir cupón",
  precio_especial: "Precio especial",
  cashback: "Cashback al monedero",
}

/** Descripción corta de cada tarjeta del paso "Mecánica" (`MechanicPicker`). */
export const BENEFIT_TYPE_DESCRIPTION: Record<BenefitType, string> = {
  descuento_porcentual:
    "Un porcentaje de descuento sobre el carrito o un producto.",
  descuento_monto_fijo:
    "Un monto fijo de descuento sobre el carrito o un producto.",
  envio_gratis: "Elimina el costo de envío al cumplirse las condiciones.",
  producto_gratis: "Regala una unidad del mismo producto u otro distinto.",
  precio_fijo_bundle: "Varios productos a un precio combinado único.",
  descuento_escalonado:
    "Más unidades o monto, mayor el descuento — por escalones.",
  por_piezas: "Compra N, paga M — ej. 3x2, 2ª unidad con descuento.",
  multiplicador_puntos: "Multiplica los puntos que ya otorga cada producto.",
  bono_puntos: "Puntos extra fijos, sin tocar el precio.",
  emitir_cupon: "Dispara una emisión real del módulo de Cupones.",
  precio_especial: "Sustituye el precio de lista de un SKU puntual.",
  cashback: "Devuelve saldo en efectivo al monedero del socio.",
}

/**
 * Mismo criterio que `TIER_OPTIONS` de `features/builder/inspector/field-specs.ts`
 * (bronce → "Base") — no se puede importar de ahí por aislamiento entre
 * features (CLAUDE.md §2), así que se repite aquí.
 */
export const TIER_NAME_LABEL: Record<TierName, string> = {
  diamante: "Diamante",
  oro: "Oro",
  plata: "Plata",
  bronce: "Base",
}

export const BXGY_SCOPE_LABEL: Record<BxgyScope, string> = {
  mismo_producto: "Mismo producto",
  misma_categoria: "Misma categoría",
  producto_especifico: "Producto específico",
}

export const DISCOUNT_TIER_THRESHOLD_LABEL: Record<
  DiscountTierThresholdType,
  string
> = {
  unidades: "Unidades",
  monto: "Monto del carrito",
}

/** Cambia junto al toggle — explica qué mide el umbral elegido (docs §7.1a). */
export const DISCOUNT_TIER_THRESHOLD_HINT: Record<
  DiscountTierThresholdType,
  string
> = {
  unidades: "El umbral cuenta unidades de los productos que califican.",
  monto: "El umbral compara el monto que califica del carrito.",
}

export const DISCOUNT_TIER_CALCULATION_MODE_LABEL: Record<
  DiscountTierCalculationMode,
  string
> = {
  escalon_unico: "Escalón único",
  progresivo: "Progresivo (por tramos)",
}

/** Explica el tradeoff salto-vs-difícil-de-explicar directo en el formulario (docs §7.1a). */
export const DISCOUNT_TIER_CALCULATION_MODE_HINT: Record<
  DiscountTierCalculationMode,
  string
> = {
  escalon_unico:
    "Se aplica el escalón más alto alcanzado a todo el pedido. Fácil de explicar, pero comprar 4 da lo mismo que comprar 3.",
  progresivo:
    "Cada tramo se descuenta por separado y se suman, como los tramos de un impuesto. Cada unidad extra siempre da un poco más.",
}

/** "3 un. → 15 %" / "USD $500,00 → 5 %" — usado por el builder de escalones y el Resumen. */
export function formatDiscountTier(
  tier: { umbral: number; beneficio_valor: number },
  thresholdType: DiscountTierThresholdType
): string {
  const from =
    thresholdType === "unidades" ? `${tier.umbral} un.` : formatUSD(tier.umbral)
  return `${from} → ${tier.beneficio_valor} %`
}

export const APPLY_TO_LABEL: Record<ApplyTo, string> = {
  subtotal_carrito: "Subtotal del carrito",
  producto: "Producto",
  envio: "Costo de envío",
}

export const LIMIT_UNIT_LABEL: Record<LimitUnit, string> = {
  veces: "veces",
  piezas: "piezas",
  monto: "monto",
  puntos: "puntos",
  cupones: "cupones",
  presupuesto: "presupuesto",
  dias: "días",
  tickets: "tickets",
}

export const LIMIT_SUBJECT_LABEL: Record<LimitSubject, string> = {
  socio: "socio",
  tarjeta: "tarjeta",
  hogar: "hogar",
  ticket: "ticket",
  tienda: "tienda",
  promocion: "promoción",
  contrato: "contrato",
}

export const LIMIT_WINDOW_LABEL: Record<LimitWindow, string> = {
  ticket: "por ticket",
  dia: "por día",
  semana: "por semana",
  mes_calendario: "por mes calendario",
  rolling: "en una ventana móvil",
  campana: "por campaña",
  vida: "de por vida",
}

export const LIMIT_EXCESS_BEHAVIOR_LABEL: Record<LimitExcessBehavior, string> =
  {
    descartar: "Descartar",
    aplicar_parcial: "Aplicar parcial",
    degradar: "Degradar a otra variante",
    encolar: "Encolar",
    alertar_continuar: "Alertar y continuar",
  }

/** "3 piezas por socio cada mes calendario — máx. 3, al exceder: aplicar parcial" — usado por `LimitsBuilder` y el Resumen. */
export function formatLimitRow(limit: {
  unidad: LimitUnit
  sujeto: LimitSubject
  ventana: LimitWindow
  ventanaDias?: number
  tope: number
  alExceder: LimitExcessBehavior
}): string {
  const ventana =
    limit.ventana === "rolling" && limit.ventanaDias
      ? `en los últimos ${limit.ventanaDias} días`
      : LIMIT_WINDOW_LABEL[limit.ventana]
  return `${limit.tope} ${LIMIT_UNIT_LABEL[limit.unidad]} por ${LIMIT_SUBJECT_LABEL[limit.sujeto]} ${ventana} · al exceder: ${LIMIT_EXCESS_BEHAVIOR_LABEL[limit.alExceder].toLowerCase()}`
}

/** Figma "Días de la semana" (1399:6) — chip por día, texto completo (no abreviado). */
export const DAY_OF_WEEK_LABEL: Record<DayOfWeek, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
}

/** Figma "Modo si hay múltiples" (07.6 "Límites y stacking", 1401:28). */
export const STACKING_MODE_LABEL: Record<StackingMode, string> = {
  mejor_beneficio: "Mejor beneficio para el cliente",
  mayor_prioridad: "Solo la de mayor prioridad",
  todas_acumulan: "Todas se acumulan",
}

export const PRIORITY_BAND_LABEL: Record<"alta" | "media" | "baja", string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
}

export function priorityBand(priority: number): "alta" | "media" | "baja" {
  if (priority >= 8) return "alta"
  if (priority >= 4) return "media"
  return "baja"
}

export const COST_NATURE_LABEL: Record<CostNature, string> = {
  margen_sacrificado: "Margen sacrificado (menor ingreso)",
  costo_producto: "Costo de producto",
  saldo_efectivo: "Saldo en efectivo (cashback)",
  ingreso_diferido: "Ingreso diferido (puntos/cupón)",
  costo_tercero: "Costo de tercero (bonificación)",
  costo_servicio: "Costo de servicio",
}

/** Cuenta contable de cada naturaleza (docs/modalidades-promocion-contexto.md, líneas 2311-2373) — mostrado como hint junto al selector. */
export const COST_NATURE_ACCOUNT_LABEL: Record<CostNature, string> = {
  margen_sacrificado: "Ingresos (contra-cuenta de ventas)",
  costo_producto: "Costo de ventas",
  saldo_efectivo: "Pasivo · monedero",
  ingreso_diferido: "Pasivo · programa de lealtad",
  costo_tercero: "Costo de ventas (bonificación)",
  costo_servicio: "Gastos de operación",
}

export const FINANCIADOR_LABEL: Record<Financiador, string> = {
  retailer: "Retailer",
  laboratorio_proveedor: "Laboratorio / proveedor",
  compartido: "Compartido",
  marca_propia: "Marca propia",
}

export const SETTLEMENT_PERIOD_LABEL: Record<SettlementPeriod, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  al_cierre_contrato: "Al cierre del contrato",
}

export const WALLET_VALUE_TYPE_LABEL: Record<WalletValueType, string> = {
  porcentaje: "Porcentaje de la compra",
  monto_fijo: "Monto fijo",
}

export const MULTIPLIER_RESOLUTION_MODE_LABEL: Record<
  MultiplierResolutionMode,
  string
> = {
  gana_mayor: "Gana el multiplicador mayor",
  exponencial: "Se multiplican entre sí",
}

export const NON_TRANSACTIONAL_BENEFIT_TYPE_LABEL: Record<
  NonTransactionalBenefitType,
  string
> = {
  envio_gratis: "Envío gratis",
  servicio: "Servicio",
  meses_sin_intereses: "Meses sin intereses",
  descuento_aliado: "Descuento en comercio aliado",
}

export const TRIGGER_EVENT_LABEL: Record<TriggerEvent, string> = {
  compra_pagada: "Compra pagada",
  devolucion: "Devolución",
  alta_socio: "Alta de socio",
  cumpleanos: "Cumpleaños del socio",
  cambio_nivel: "Cambio de nivel",
  inactividad: "Inactividad detectada",
  fecha_programada: "Fecha programada",
  redencion_cupon: "Redención de cupón",
  inscripcion_programa: "Inscripción a programa",
}

export const TRIGGER_RESOLUTION_MOMENT_LABEL: Record<
  TriggerResolutionMoment,
  string
> = {
  en_caja: "En caja, antes de cobrar",
  cierre_ticket: "Al cerrar el ticket",
  proceso_nocturno: "Proceso nocturno",
  al_ocurrir: "Al ocurrir el evento",
}

export const TRIGGER_FREQUENCY_LABEL: Record<TriggerFrequency, string> = {
  cada_vez: "Cada vez que ocurre",
  una_vez_ano: "Una vez al año",
  una_vez_vida: "Una vez en la vida",
}

export const APPLICATION_LEVEL_LABEL: Record<ApplicationLevel, string> = {
  linea: "Línea",
  ticket: "Ticket completo",
}

export const PRICE_BASIS_LABEL: Record<PriceBasis, string> = {
  lista: "Precio de lista",
  vigente: "Precio vigente",
}

export const BALANCE_TYPE_LABEL: Record<BalanceType, string> = {
  canjeable: "Canjeable",
  calificador: "Calificador (no canjeable)",
}

export const ACCRUAL_TIMING_LABEL: Record<AccrualTiming, string> = {
  inmediato: "Inmediato",
  diferido: "Diferido",
}

export const BALANCE_INITIAL_STATE_LABEL: Record<BalanceInitialState, string> =
  {
    disponible: "Disponible",
    pendiente: "Pendiente",
  }

export const POINTS_DEBIT_TIMING_LABEL: Record<PointsDebitTiming, string> = {
  al_emitir: "Al emitir el cupón",
  al_redimir: "Al redimir el cupón",
}

export const RX_APPLICABILITY_LABEL: Record<RxApplicability, string> = {
  permitido: "Permitido",
  revisar: "Revisar caso por caso",
  restringido: "Restringido",
}

export const ENROLLMENT_REQUIREMENT_LABEL: Record<
  EnrollmentRequirement,
  string
> = {
  ninguno: "Ninguno",
  perfil_completo: "Perfil completo",
  primera_compra: "Primera compra",
}
