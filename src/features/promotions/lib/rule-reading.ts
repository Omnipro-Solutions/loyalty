import { formatUSD, formatDate } from "@/lib/format"

import { isConditionGroup } from "./condition-tree"
import {
  APPLY_TO_LABEL,
  CHANNEL_SCOPE_LABEL,
  CONDITION_FIELD_LABEL,
  CONDITION_FIELD_OPERATOR,
  DAY_OF_WEEK_LABEL,
  DISCOUNT_TIER_THRESHOLD_LABEL,
  STACKING_MODE_LABEL,
  STORE_FORMAT_LABEL,
  formatDiscountTier,
  formatLimitRow,
} from "./labels"
import type {
  ConditionNodeValues,
  ConditionValues,
  PromotionValues,
} from "../schemas"

/** Diccionarios de id → nombre que hacen legible una condición (categorías, segmentos…). */
export type RuleReadingNames = {
  categoryNameById: Map<string, string>
  segmentNameById: Map<string, string>
  couponBatchNameById: Map<string, string>
  tierNameById: Map<string, string>
  productNameById: Map<string, string>
}

export const EMPTY_RULE_READING_NAMES: RuleReadingNames = {
  categoryNameById: new Map(),
  segmentNameById: new Map(),
  couponBatchNameById: new Map(),
  tierNameById: new Map(),
  productNameById: new Map(),
}

/** Construye los 5 mapas desde las listas de opciones que ya cargan las páginas — evita repetir los `new Map(...)` en cada consumidor. */
export function buildRuleReadingNames(options: {
  categories: { id: string; name: string }[]
  segments: { id: string; name: string }[]
  products: { id: string; name: string }[]
  couponBatches: { id: string; name: string }[]
  tiers: { id: string; name: string }[]
}): RuleReadingNames {
  const toMap = (rows: { id: string; name: string }[]) =>
    new Map(rows.map((row) => [row.id, row.name]))
  return {
    categoryNameById: toMap(options.categories),
    segmentNameById: toMap(options.segments),
    couponBatchNameById: toMap(options.couponBatches),
    tierNameById: toMap(options.tiers),
    productNameById: toMap(options.products),
  }
}

/**
 * Valor de una condición hoja en texto legible. Vive aquí (y no en el
 * componente del Resumen, de donde salió) porque tanto la vista de detalle
 * como la lectura lógica de la regla lo necesitan.
 */
export function formatConditionValue(
  condition: ConditionValues,
  names: RuleReadingNames
): string {
  if (condition.campo === "categoria") {
    return (
      condition.valor
        .map((id) => names.categoryNameById.get(id) ?? id)
        .join(", ") || "—"
    )
  }
  if (condition.campo === "producto") {
    return (
      condition.valor
        .map((id) => names.productNameById.get(id) ?? id)
        .join(", ") || "—"
    )
  }
  if (condition.campo === "segmento") {
    return names.segmentNameById.get(condition.valor) ?? condition.valor
  }
  if (condition.campo === "monto_carrito") {
    return formatUSD(condition.valor)
  }
  if (condition.campo === "cupon_codigo") {
    return names.couponBatchNameById.get(condition.valor) ?? condition.valor
  }
  if (condition.campo === "socio_nivel") {
    return (
      condition.valor
        .map((id) => names.tierNameById.get(id) ?? id)
        .join(", ") || "—"
    )
  }
  if (condition.campo === "tienda_formato") {
    return (
      condition.valor
        .map((f) => STORE_FORMAT_LABEL[f as keyof typeof STORE_FORMAT_LABEL])
        .join(", ") || "—"
    )
  }
  if (
    condition.campo === "socio_provincia" ||
    condition.campo === "tienda_region" ||
    condition.campo === "producto_marca" ||
    condition.campo === "producto_proveedor"
  ) {
    return condition.valor.join(", ") || "—"
  }
  if (condition.campo === "socio_antiguedad") {
    return `${condition.valor} meses o más`
  }
  if (condition.campo === "socio_edad") {
    return `${condition.valor} años o más`
  }
  return String(condition.valor)
}

/** "Categoría del producto pertenece a Bebidas" — una hoja como frase. */
function conditionLeafSentence(
  condition: ConditionValues,
  names: RuleReadingNames
): string {
  return `${CONDITION_FIELD_LABEL[condition.campo]} ${CONDITION_FIELD_OPERATOR[condition.campo]} ${formatConditionValue(condition, names)}`
}

/**
 * El árbol de condiciones como una expresión booleana legible:
 * `A Y (B O C)`. Los paréntesis solo aparecen en subgrupos con más de un
 * hijo — ahí es donde el anidamiento cambia el significado, y ponerlos
 * siempre convertiría una regla simple en ruido.
 */
export function conditionExpression(
  node: ConditionNodeValues,
  names: RuleReadingNames,
  depth = 0
): string {
  if (!isConditionGroup(node)) return conditionLeafSentence(node, names)
  if (node.condiciones.length === 0) return ""

  const connector = node.combinador === "todas" ? " Y " : " O "
  const parts = node.condiciones
    .map((child) => conditionExpression(child, names, depth + 1))
    .filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]

  const joined = parts.join(connector)
  return depth === 0 ? joined : `(${joined})`
}

/** "entrega 15 % de descuento sobre el subtotal del carrito" — la mecánica como frase. */
export function benefitSentence(values: Partial<PromotionValues>): string {
  const benefitType = values.benefitType
  if (!benefitType) return "—"

  const over = values.applyTo
    ? ` sobre ${APPLY_TO_LABEL[values.applyTo].toLowerCase()}`
    : ""
  const cap = values.maxCap ? `, con tope de ${formatUSD(values.maxCap)}` : ""

  switch (benefitType) {
    case "descuento_porcentual":
      return `descuenta ${values.benefitValue ?? "?"} %${over}${cap}`
    case "descuento_monto_fijo":
      return `descuenta ${values.benefitValue !== undefined ? formatUSD(values.benefitValue) : "?"}${over}${cap}`
    case "descuento_escalonado": {
      const thresholdType = values.thresholdType ?? "unidades"
      const tiers = [...(values.discountTiers ?? [])].sort(
        (a, b) => a.umbral - b.umbral
      )
      const unit = DISCOUNT_TIER_THRESHOLD_LABEL[thresholdType].toLowerCase()
      if (tiers.length === 0) {
        return `descuenta por escalones de ${unit} (sin escalones definidos)`
      }
      return `descuenta por escalones de ${unit}: ${tiers
        .map((tier) => formatDiscountTier(tier, thresholdType))
        .join(" · ")}${cap}`
    }
    case "por_piezas":
      return `cobra ${values.pagaCantidad ?? "?"} de cada ${values.compraCantidad ?? "?"} piezas${
        values.descuentoUnidadExtraPct
          ? ` (${values.descuentoUnidadExtraPct} % en la unidad extra)`
          : ""
      }`
    case "producto_gratis":
      return `regala ${values.cantidadRegalo ?? 1} unidad(es)${
        values.beneficioSobreRegaloPct !== undefined &&
        values.beneficioSobreRegaloPct < 100
          ? ` con ${values.beneficioSobreRegaloPct} % de descuento`
          : ""
      }`
    case "precio_fijo_bundle":
      return `deja el bundle de ${(values.productosBundleIds ?? []).length} producto(s) en ${
        values.benefitValue !== undefined ? formatUSD(values.benefitValue) : "?"
      }`
    case "precio_especial":
      return `fija el precio en ${
        values.precioPromocional !== undefined
          ? formatUSD(values.precioPromocional)
          : "?"
      }${values.hastaAgotarExistencias ? " hasta agotar existencias" : ""}`
    case "multiplicador_puntos":
      return `multiplica los puntos × ${values.multiplicadorPuntos ?? "?"}`
    case "bono_puntos":
      return `acredita ${values.bonoPuntos ?? "?"} puntos de bono`
    case "cashback":
      return `devuelve ${
        values.tipoMonedero === "monto_fijo"
          ? formatUSD(values.benefitValue ?? 0)
          : `${values.benefitValue ?? "?"} %`
      } al monedero`
    case "emitir_cupon":
      return `emite un cupón${
        values.duracionCuponDias
          ? ` vigente ${values.duracionCuponDias} días`
          : ""
      }`
    case "envio_gratis":
      return "entrega el envío gratis"
    case "descuento_continuidad":
      return "descuenta según la continuidad de compra del socio"
  }
  // Sin `default` a propósito: el switch cubre las 13 mecánicas de
  // `BENEFIT_TYPES`, así que añadir una 14ª rompe el tipo de retorno aquí
  // en vez de caer en silencio a una frase genérica.
}

/** Ventana de vigencia como frase: fechas + días + horario. */
export function validitySentence(values: Partial<PromotionValues>): string {
  const from = values.validFrom ? formatDate(values.validFrom) : "—"
  const range = values.validUntil
    ? `del ${from} al ${formatDate(values.validUntil)}`
    : `desde el ${from}, de forma permanente`

  const days = values.daysOfWeek ?? []
  const daysPart =
    days.length === 0 || days.length === 7
      ? "todos los días"
      : days.map((d) => DAY_OF_WEEK_LABEL[d].toLowerCase()).join(", ")

  const hours =
    values.horaInicio && values.horaFin
      ? `, de ${values.horaInicio} a ${values.horaFin}`
      : ""

  return `${range} · ${daysPart}${hours}`
}

export const RULE_CLAUSE_IDS = [
  "cuando",
  "si",
  "entonces",
  "mientras",
  "salvo",
  "hasta",
] as const
export type RuleClauseId = (typeof RULE_CLAUSE_IDS)[number]

export type RuleClause = {
  id: RuleClauseId
  /** Palabra clave de la cláusula ("SI", "ENTONCES"…). */
  keyword: string
  text: string
}

/**
 * La promoción leída como una regla, en el orden en que se entiende:
 * CUANDO (dónde aplica) · SI (condiciones) · ENTONCES (beneficio) ·
 * MIENTRAS (vigencia) · SALVO (acumulación) · HASTA (límites).
 *
 * Es la misma información del Resumen, pero como una sola frase encadenada
 * — el Resumen responde "qué guardé en cada campo" y esto responde "qué va
 * a hacer el motor". Función pura: se prueba en `rule-reading.test.ts`.
 */
export function readRule(
  values: Partial<PromotionValues>,
  names: RuleReadingNames = EMPTY_RULE_READING_NAMES
): RuleClause[] {
  const channel = values.channelScope
    ? CHANNEL_SCOPE_LABEL[values.channelScope]
    : "—"

  const conditions = values.conditions
    ? conditionExpression(values.conditions, names)
    : ""

  const limits = values.limites ?? []
  const budget = values.assignedBudget
    ? `presupuesto de ${formatUSD(values.assignedBudget)}`
    : ""
  const limitParts = [...limits.map(formatLimitRow), budget].filter(Boolean)

  const stacking = values.stackable
    ? `se acumula con otras promociones — ${values.stackingMode ? STACKING_MODE_LABEL[values.stackingMode].toLowerCase() : "—"}`
    : "no se acumula con ninguna otra promoción"
  const exclusion = values.exclusionGroup
    ? ` · excluye al grupo "${values.exclusionGroup}"`
    : ""

  return [
    {
      id: "cuando",
      keyword: "CUANDO",
      text: `una compra ocurre en ${channel}`,
    },
    {
      id: "si",
      keyword: "SI",
      text: conditions || "sin condiciones — aplica a cualquier compra",
    },
    {
      id: "entonces",
      keyword: "ENTONCES",
      text: benefitSentence(values),
    },
    {
      id: "mientras",
      keyword: "MIENTRAS",
      text: validitySentence(values),
    },
    {
      id: "salvo",
      keyword: "SALVO",
      text: `${stacking}${exclusion} · prioridad ${values.priority ?? "—"}`,
    },
    {
      id: "hasta",
      keyword: "HASTA",
      text:
        limitParts.length > 0
          ? limitParts.join(" · ")
          : "sin límites de uso ni presupuesto declarados",
    },
  ]
}
