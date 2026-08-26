import { formatUSD } from "@/lib/format"

import {
  normalizeContinuityTiers,
  type ContinuityTier,
} from "./continuity-discount"
import type { PromotionStatus } from "./status"
import type {
  AccrualTiming,
  ApplicationLevel,
  ChannelScope,
  ApplyTo,
  BalanceInitialState,
  BalanceType,
  BxgyScope,
  ConditionField,
  ConditionFieldDomain,
  ConditionCombinator,
  ContinuityBreakBehavior,
  ContinuityWindowUnit,
  CostNature,
  BenefitType,
  DayOfWeek,
  DiscountTierCalculationMode,
  DiscountTierThresholdType,
  EnrollmentRequirement,
  Financiador,
  Gender,
  LimitExcessBehavior,
  LimitSubject,
  LimitUnit,
  LimitWindow,
  MaritalStatus,
  MultiplierResolutionMode,
  NonTransactionalBenefitType,
  PieceSelectionCriterion,
  PointsDebitTiming,
  PriceBasis,
  PromotionEventType,
  PromotionPublicationStatus,
  PromotionStatusChangeReason,
  PromotionType,
  ReturnEffect,
  RxApplicability,
  SettlementPeriod,
  StackingMode,
  StoreFormat,
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

/**
 * Estado de la promoción — el del campo "Estado" del formulario y el de la
 * columna ESTADO de 06.1. Cubre los cuatro estados guardados más
 * `programada`, que se deriva (ver `lib/status.ts`).
 */
export const PROMOTION_STATUS_LABEL: Record<PromotionStatus, string> = {
  borrador: "Borrador",
  activa: "Activa",
  programada: "Programada",
  inactiva: "Inactiva",
  finalizada: "Finalizada",
}

/** Descripción de cada estado elegible, para el hint del campo "Estado". */
export const PROMOTION_PUBLICATION_STATUS_DESCRIPTION: Record<
  PromotionPublicationStatus,
  string
> = {
  borrador: "Aún no publicada — se puede seguir editando.",
  activa: "Publicada: el motor la evalúa dentro de su vigencia.",
  inactiva: "Publicada pero suspendida — el motor la ignora.",
  finalizada: "Cerrada: no vuelve a aplicarse mientras siga en este estado.",
}

/** Punto de color del estado (columna ESTADO de 06.1 y tarjeta de estado). */
export const PROMOTION_STATUS_DOT: Record<PromotionStatus, string> = {
  activa: "bg-success",
  programada: "bg-warning",
  finalizada: "bg-border-strong",
  inactiva: "bg-destructive",
  borrador: "bg-muted-foreground",
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
  producto: "Producto específico",
  tienda: "Tienda",
  segmento: "Segmento del cliente",
  monto_carrito: "Monto del carrito",
  cupon_codigo: "Código de cupón",
  socio_nivel: "Nivel de lealtad",
  socio_provincia: "Provincia del socio",
  socio_antiguedad: "Antigüedad como socio",
  socio_edad: "Edad del socio",
  genero: "Género",
  estado_civil: "Estado civil",
  tiene_hijos: "¿Tiene hijos?",
  tiene_mascotas: "¿Tiene mascotas?",
  tienda_region: "Región de la tienda",
  tienda_formato: "Formato de tienda",
  producto_marca: "Marca del producto",
  producto_proveedor: "Proveedor / laboratorio",
  producto_receta: "Requiere receta",
}

/**
 * Nombre corto para las etiquetas de la columna ALCANCE (06.1): ahí caben
 * ~90px, así que "Categoría del producto" tiene que ser "Categoría". El
 * nombre largo sigue usándose en el formulario y en el árbol del hover.
 */
export const CONDITION_FIELD_SHORT_LABEL: Record<ConditionField, string> = {
  categoria: "Categoría",
  producto: "Producto",
  tienda: "Ciudad",
  segmento: "Segmento",
  monto_carrito: "Carrito",
  cupon_codigo: "Cupón",
  socio_nivel: "Nivel",
  socio_provincia: "Provincia",
  socio_antiguedad: "Antigüedad",
  socio_edad: "Edad",
  genero: "Género",
  estado_civil: "Estado civil",
  tiene_hijos: "Hijos",
  tiene_mascotas: "Mascotas",
  tienda_region: "Región",
  tienda_formato: "Formato",
  producto_marca: "Marca",
  producto_proveedor: "Proveedor",
  producto_receta: "Receta",
}

/** Operador implícito por campo (07.1: cada campo del mock trae siempre el mismo operador). */
export const CONDITION_FIELD_OPERATOR: Record<ConditionField, string> = {
  categoria: "pertenece a",
  producto: "pertenece a",
  tienda: "está en",
  segmento: "es igual a",
  monto_carrito: "mayor o igual a",
  cupon_codigo: "coincide con",
  socio_nivel: "pertenece a",
  socio_provincia: "está en",
  socio_antiguedad: "mayor o igual a",
  socio_edad: "mayor o igual a",
  genero: "pertenece a",
  estado_civil: "pertenece a",
  tiene_hijos: "es igual a",
  tiene_mascotas: "es igual a",
  tienda_region: "está en",
  tienda_formato: "pertenece a",
  producto_marca: "pertenece a",
  producto_proveedor: "pertenece a",
  producto_receta: "es igual a",
}

/** Agrupa el `Select` de campo por ámbito (`CONDITION_FIELD_DOMAINS`) — 19 campos en una lista plana son difíciles de escanear sin agrupar. */
export const CONDITION_FIELD_DOMAIN: Record<
  ConditionField,
  ConditionFieldDomain
> = {
  monto_carrito: "Carrito",
  categoria: "Producto",
  producto: "Producto",
  producto_marca: "Producto",
  producto_proveedor: "Producto",
  producto_receta: "Producto",
  tienda: "Tienda",
  tienda_region: "Tienda",
  tienda_formato: "Tienda",
  segmento: "Cliente",
  socio_nivel: "Cliente",
  socio_provincia: "Cliente",
  socio_antiguedad: "Cliente",
  socio_edad: "Cliente",
  genero: "Cliente",
  estado_civil: "Cliente",
  tiene_hijos: "Cliente",
  tiene_mascotas: "Cliente",
  cupon_codigo: "Cupón",
}

/** Duplica `STORE_FORMAT_LABEL` de `features/stores/lib/labels.ts` (aislamiento entre features, CLAUDE.md §2) — alimenta la condición "Formato de tienda", que reusa la tupla `STORE_FORMATS` directamente porque su `check` de Postgres ya coincide 1:1. */
export const STORE_FORMAT_LABEL: Record<StoreFormat, string> = {
  flagship: "Flagship",
  express: "Express",
  mall: "Mall",
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
  descuento_continuidad: "Descuento por continuidad",
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
  descuento_continuidad:
    "El descuento crece con cada compra consecutiva dentro de una ventana de días.",
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

/** Igual que `features/members/lib/labels.ts` `GENDER_LABEL`/`MARITAL_STATUS_LABEL` — duplicado a propósito (features aisladas, CLAUDE.md §2). */
export const GENDER_LABEL: Record<Gender, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  otro: "Otro",
  prefiere_no_decir: "Prefiere no decir",
}

export const MARITAL_STATUS_LABEL: Record<MaritalStatus, string> = {
  soltero: "Soltero(a)",
  casado: "Casado(a)",
  union_libre: "Unión libre",
  divorciado: "Divorciado(a)",
  viudo: "Viudo(a)",
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

/** `descuento_continuidad` — qué pasa al exceder la ventana de continuidad entre compras. */
export const CONTINUITY_BREAK_BEHAVIOR_LABEL: Record<
  ContinuityBreakBehavior,
  string
> = {
  reiniciar: "Reinicia al primer escalón",
  retroceder_un_escalon: "Retrocede un escalón",
  mantener: "Mantiene el escalón alcanzado",
}

/** `descuento_continuidad` — efecto de una devolución sobre el escalón alcanzado. */
export const RETURN_EFFECT_LABEL: Record<ReturnEffect, string> = {
  no_afecta: "No afecta el escalón",
  rompe_racha: "Reinicia la continuidad",
  retrocede_escalon: "Retrocede un escalón",
}

/** `descuento_continuidad` — sobre qué piezas elegibles recae el beneficio cuando el límite de piezas topa las unidades. */
export const PIECE_SELECTION_CRITERION_LABEL: Record<
  PieceSelectionCriterion,
  string
> = {
  menor_precio: "Las de menor precio",
  mayor_precio: "Las de mayor precio",
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

/** "Compra 2 → 25 %" — mismo par que `formatDiscountTier`, para `descuento_continuidad` (`umbral` es el ordinal de compra, no unidades/monto). */
export function formatContinuityTier(tier: {
  umbral: number
  beneficio_valor: number
}): string {
  return `Compra ${tier.umbral} → ${tier.beneficio_valor} %`
}

/**
 * Traduce la configuración de `descuento_continuidad` a una frase en
 * lenguaje natural — el mecanismo más directo para que quien configura la
 * regla confirme que hizo lo que quería, sin tener que interpretar 6
 * campos por separado. `null` mientras falte lo mínimo para que la frase
 * tenga sentido (2+ escalones y la ventana).
 */
export function describeContinuityRule(
  tiers: ContinuityTier[],
  window: {
    amount: number | undefined
    unit: ContinuityWindowUnit | undefined
  },
  breakBehavior: ContinuityBreakBehavior | undefined,
  evaluatesHistory?: boolean
): string | null {
  const sorted = normalizeContinuityTiers(tiers)
  if (sorted.length < 2 || !window.amount) return null

  const ladder = sorted
    .map((tier, i) => `${i + 1}.ª compra ${tier.beneficio_valor} %`)
    .join(" → ")

  const breakPhrase =
    breakBehavior === "mantener"
      ? "el cliente conserva el escalón alcanzado"
      : breakBehavior === "retroceder_un_escalon"
        ? "la racha retrocede un escalón"
        : `la racha se reinicia y la siguiente compra vuelve a valer ${sorted[0].beneficio_valor} %`

  const historyPhrase = evaluatesHistory
    ? " Cuenta también las compras anteriores al inicio de la promoción."
    : " La racha empieza a contar desde el inicio de la promoción."

  return `${ladder}. Si la siguiente compra ocurre dentro de ${formatContinuityWindow(window.amount, window.unit)}, sube al siguiente escalón; si pasan más, ${breakPhrase}.${historyPhrase}`
}

export const CONTINUITY_WINDOW_UNIT_LABEL: Record<
  ContinuityWindowUnit,
  string
> = {
  dias: "días",
  semanas: "semanas",
  meses: "meses",
  bimestres: "bimestres",
}

/** Singular explícito, no `replace(/s$/)`: eso convierte "meses" en "mese". */
const CONTINUITY_WINDOW_UNIT_SINGULAR: Record<ContinuityWindowUnit, string> = {
  dias: "día",
  semanas: "semana",
  meses: "mes",
  bimestres: "bimestre",
}

/** "35 días" / "2 meses" / "1 mes". */
export function formatContinuityWindow(
  amount: number | undefined,
  unit: ContinuityWindowUnit | undefined
): string {
  if (!amount) return "—"
  const key = unit ?? "dias"
  return `${amount} ${
    amount === 1
      ? CONTINUITY_WINDOW_UNIT_SINGULAR[key]
      : CONTINUITY_WINDOW_UNIT_LABEL[key]
  }`
}

export const APPLY_TO_LABEL: Record<ApplyTo, string> = {
  subtotal_carrito: "Subtotal del carrito",
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

/** Bitácora de "Panel de promociones · Logs" (`promocion_eventos.tipo`). */
export const PROMOTION_EVENT_TYPE_LABEL: Record<PromotionEventType, string> = {
  creada: "Creada",
  editada: "Editada",
  activada: "Activada",
  inactivada: "Inactivada",
  finalizada: "Finalizada",
  presupuesto_incrementado: "Presupuesto incrementado",
  presupuesto_agotado: "Presupuesto agotado",
  vencida: "Vencida",
  cancelada: "Cancelada",
  canje: "Canje",
  canje_rechazado: "Canje rechazado",
}

/** Motivo del cambio de estado (`promocion_eventos.codigo_motivo`). */
export const PROMOTION_STATUS_CHANGE_REASON_LABEL: Record<
  PromotionStatusChangeReason,
  string
> = {
  decision_comercial: "Decisión comercial",
  presupuesto: "Presupuesto",
  error_configuracion: "Error de configuración",
  bajo_rendimiento: "Bajo rendimiento",
  fin_de_campana: "Fin de campaña",
  otro: "Otro (especificar)",
}
