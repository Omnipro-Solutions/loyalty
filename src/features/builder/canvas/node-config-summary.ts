import { findEvent } from "@/config/event-catalog"
import { isMessageNodeType } from "@/config/integration-flows"
import { formatNumber, formatUSD } from "@/lib/format"
import type { BuilderNodeType } from "@/types/domain"

import {
  countRulesAndDepth,
  type ConditionGroup,
} from "../inspector/condition-preview"
import { SIMPLE_FIELD_SPECS, type FieldSpec } from "../inspector/field-specs"

export type ConfigSummary = {
  rows: { label: string; value: string }[]
  pills?: string[]
}

type Branch = {
  id: string
  label: string
  /** Estimación para Simular; ya no enruta en `ramificacion_valor` — ver `BranchesTab`. */
  shareEstimate?: number
  /** Campo anterior a la condición por rama, se sigue leyendo como respaldo. */
  weight?: number
  condition?: { rules?: unknown[] }
}

function branchesFromConfig(config: Record<string, unknown>): Branch[] | null {
  const branches = config.branches
  if (!Array.isArray(branches) || branches.length === 0) return null
  const parsed = branches.filter(
    (b): b is Branch =>
      !!b && typeof b === "object" && typeof (b as Branch).label === "string"
  )
  return parsed.length > 0 ? parsed : null
}

function branchPills(branches: Branch[]): string[] {
  return branches.map((b) => {
    const share = b.shareEstimate ?? b.weight
    return typeof share === "number"
      ? `${b.label} ${Math.round(share)}%`
      : b.label
  })
}

/**
 * En `ramificacion_valor` lo que decide el camino es la condición de cada
 * rama, no el porcentaje. La tarjeta lo dice porque una rama sin condición
 * bloquea Publicar (`validateGraph`) y descubrirlo al pulsar el botón, en
 * un grafo con seis bloques, obliga a abrirlos uno por uno.
 */
function branchConditionRow(branches: Branch[]): {
  label: string
  value: string
} {
  const missing = branches.filter(
    (b) => b.id !== "por_defecto" && !b.condition?.rules?.length
  )
  return {
    label: "Enrutado por",
    value: missing.length
      ? `${String(missing.length)} rama(s) sin condición`
      : "Condición de cada rama",
  }
}

function selectLabel(
  tipo: BuilderNodeType,
  key: string,
  value: unknown
): string | undefined {
  const spec = (SIMPLE_FIELD_SPECS[tipo] ?? []).find((s) => s.key === key)
  if (!spec || spec.kind !== "select" || typeof value !== "string")
    return undefined
  return spec.options.find((o) => o.value === value)?.label
}

/** "Ramificar por nivel" (Figma "08.4 · Ramificación"): atributo evaluado + una salida por rama, más "por defecto" si el bloque la tiene activada. */
function ramificacionValorSummary(
  config: Record<string, unknown>
): ConfigSummary | null {
  const branches = branchesFromConfig(config)
  if (!branches) return null
  const rows: ConfigSummary["rows"] = []
  const attrLabel = selectLabel(
    "ramificacion_valor",
    "atributo_evaluado",
    config.atributo_evaluado
  )
  if (attrLabel) rows.push({ label: "Atributo", value: attrLabel })
  const hasDefault = config.salida_por_defecto === true
  rows.push({
    label: "Salidas",
    value: `${String(branches.length)} rama${branches.length === 1 ? "" : "s"}${hasDefault ? " + por defecto" : ""}`,
  })
  rows.push(branchConditionRow(branches))
  return { rows, pills: branchPills(branches) }
}

function splitAbSummary(config: Record<string, unknown>): ConfigSummary | null {
  const branches = branchesFromConfig(config)
  if (!branches) return null
  const rows: ConfigSummary["rows"] = []
  const criterioLabel = selectLabel(
    "split_ab",
    "criterio_exito",
    config.criterio_exito
  )
  if (criterioLabel) rows.push({ label: "Criterio", value: criterioLabel })
  rows.push({
    label: "Variantes",
    value: `${String(branches.length)} variante${branches.length === 1 ? "" : "s"}`,
  })
  return { rows, pills: branchPills(branches) }
}

/** Reusa `countRulesAndDepth`, la misma fuente que arma "CONDICIONES · N en M niveles" en el inspector (`multi-condition-form.tsx`). */
function condicionMultipleSummary(
  config: Record<string, unknown>
): ConfigSummary | null {
  const condiciones = config.condiciones
  if (!condiciones || typeof condiciones !== "object") return null
  const group = condiciones as ConditionGroup
  if (!Array.isArray(group.rules)) return null
  const { rules } = countRulesAndDepth(group)
  if (rules === 0) return null
  const combinatorLabel = group.combinator === "or" ? "Alguna" : "Todas"
  return {
    rows: [
      {
        label: "Condiciones",
        value: `${String(rules)} regla${rules === 1 ? "" : "s"} · ${combinatorLabel}`,
      },
    ],
  }
}

function acumularPuntosSummary(
  config: Record<string, unknown>
): ConfigSummary | null {
  const rows: ConfigSummary["rows"] = []
  if (typeof config.amountUnit === "number" && config.amountUnit > 0) {
    rows.push({
      label: "Puntos",
      value: `1 pt cada ${formatUSD(config.amountUnit)}`,
    })
  }
  if (typeof config.capPerTransaction === "number") {
    rows.push({
      label: "Tope",
      value: `${formatNumber(config.capPerTransaction)} pts/transacción`,
    })
  }
  if (rows.length === 0) return null

  const modifiers = Array.isArray(config.modifiers)
    ? config.modifiers.length
    : 0
  const bonuses =
    (Array.isArray(config.itemBonuses) ? config.itemBonuses.length : 0) +
    (Array.isArray(config.invoiceBonuses) ? config.invoiceBonuses.length : 0)
  const pills: string[] = []
  if (modifiers > 0)
    pills.push(`${String(modifiers)} modificador${modifiers === 1 ? "" : "es"}`)
  if (bonuses > 0)
    pills.push(`${String(bonuses)} bono${bonuses === 1 ? "" : "s"}`)

  return { rows, pills: pills.length > 0 ? pills : undefined }
}

/** "Webhook saliente": método + URL, con pills de cuánto hay configurado en headers/cuerpo (listas dinámicas que no viven en `SIMPLE_FIELD_SPECS`, ver `webhook-saliente-form.tsx`). */
function webhookSalienteSummary(
  config: Record<string, unknown>
): ConfigSummary | null {
  if (typeof config.url !== "string" || config.url.trim() === "") return null
  const metodoLabel =
    selectLabel("webhook_saliente", "metodo", config.metodo) ?? "POST"
  const rows: ConfigSummary["rows"] = [
    { label: "Método", value: metodoLabel },
    { label: "URL", value: config.url },
  ]

  const headers = Array.isArray(config.headers) ? config.headers.length : 0
  const cuerpo = Array.isArray(config.cuerpo) ? config.cuerpo.length : 0
  const pills: string[] = []
  if (headers > 0)
    pills.push(`${String(headers)} header${headers === 1 ? "" : "s"}`)
  if (cuerpo > 0)
    pills.push(`${String(cuerpo)} campo${cuerpo === 1 ? "" : "s"} en el cuerpo`)

  return { rows, pills: pills.length > 0 ? pills : undefined }
}

const REFERENCE_KINDS: FieldSpec["kind"][] = [
  "audience-select",
  "coupon-select",
  "promotion-select",
]

/**
 * Estas 3 clases de campo guardan solo un id (`config.audiencia_id`,
 * `config.coupon_batch_id`…) — el nombre real vive en una lista que
 * `InspectorPanel` carga por fetch (ver `SimpleConfigForm`), a la que este
 * componente puramente presentacional no tiene acceso. Mostrar el id crudo
 * sería peor que no mostrar nada, así que se excluyen del resumen.
 */
function hasSummarizableValue(spec: FieldSpec, value: unknown): boolean {
  if (REFERENCE_KINDS.includes(spec.kind) || spec.kind === "textarea")
    return false
  if (value === undefined || value === null) return false
  switch (spec.kind) {
    case "boolean":
      return value === true
    case "multiselect":
      return Array.isArray(value) && value.length > 0
    case "time-range": {
      const range = value as { desde?: string; hasta?: string }
      return Boolean(range.desde ?? range.hasta)
    }
    case "text":
      return typeof value === "string" && value.trim().length > 0
    case "number":
    case "currency":
      return typeof value === "number"
    case "select":
      return typeof value === "string" && value.length > 0
    default:
      return false
  }
}

function formatFieldValue(spec: FieldSpec, value: unknown): string {
  switch (spec.kind) {
    case "boolean":
      return "Sí"
    case "select":
      return spec.options.find((o) => o.value === value)?.label ?? String(value)
    case "multiselect": {
      const labels = (value as string[]).map(
        (v) => spec.options.find((o) => o.value === v)?.label ?? v
      )
      return labels.length <= 2
        ? labels.join(", ")
        : `${labels.slice(0, 2).join(", ")} +${String(labels.length - 2)}`
    }
    case "number":
      return spec.suffix
        ? `${formatNumber(value as number)} ${spec.suffix}`
        : formatNumber(value as number)
    case "currency":
      return formatUSD(value as number)
    case "time-range": {
      const range = value as { desde?: string; hasta?: string }
      return [range.desde, range.hasta].filter(Boolean).join(" – ")
    }
    default:
      return String(value)
  }
}

/**
 * Bloques "simples" dirigidos por `SIMPLE_FIELD_SPECS` (17 tipos, ver
 * `field-specs.ts`): sin componente dedicado, así que el resumen tampoco lo
 * tiene — muestra hasta 2 campos ya configurados, priorizando los
 * obligatorios (la misma señal que ya separa "Opcional" en
 * `SimpleConfigForm`) sobre los opcionales.
 */
function genericSummary(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): ConfigSummary | null {
  const specs = SIMPLE_FIELD_SPECS[tipo] ?? []
  const withValue = specs.filter((s) => hasSummarizableValue(s, config[s.key]))
  if (withValue.length === 0) return null
  const required = withValue.filter((s) => "required" in s && s.required)
  const chosen = (required.length > 0 ? required : withValue).slice(0, 2)
  return {
    rows: chosen.map((s) => ({
      label: s.label,
      value: formatFieldValue(s, config[s.key]),
    })),
  }
}

/**
 * El bloque de Entrada tiene dos datos que lo definen y que no se pueden
 * leer del `FieldSpec` genérico: qué evento escucha (su etiqueta legible,
 * no el id que guarda `config`) y en qué modo dispara. Dos nodos con el
 * mismo evento y distinto modo hacen cosas muy distintas, y sin el modo en
 * la tarjeta se ven idénticos.
 */
function eventoSummary(config: Record<string, unknown>): ConfigSummary | null {
  const event = findEvent(
    typeof config.evento_id === "string" ? config.evento_id : null
  )
  if (!event) return null

  const rows: ConfigSummary["rows"] = [{ label: "Evento", value: event.label }]
  const modo = selectLabel("evento", "modo_disparo", config.modo_disparo)
  const modoValue =
    modo ??
    (config.modo_disparo === "al_ocurrir"
      ? "Al ocurrir"
      : config.modo_disparo === "al_cruzar_umbral"
        ? "Al cruzar un umbral"
        : config.modo_disparo === "programado"
          ? "Programado"
          : null)
  if (modoValue) rows.push({ label: "Modo", value: modoValue })

  const pills: string[] = []
  if (config.modo_disparo === "al_cruzar_umbral") {
    if (typeof config.umbral_valor === "number") {
      pills.push(`cada ${formatNumber(config.umbral_valor)}`)
    }
    if (config.repeticion === "una_vez") pills.push("una sola vez")
    if (config.deteccion === "nivel") pills.push("por nivel")
    else if (config.deteccion === "borde") pills.push("por borde")
  }
  return { rows, pills: pills.length ? pills : undefined }
}

/**
 * Resumen de configuración por tipo de bloque para la tarjeta del canvas
 * (Figma "08.4 · Ramificación · Ramificar por nivel") — generaliza
 * `messageFlowSummary` de `builder-node.tsx` (ese sigue aparte: su fuente,
 * el flujo de un proveedor externo, no es un `FieldSpec`). `null` = nada
 * relevante configurado todavía, mismo contrato que `messageFlowSummary`.
 */
export function configSummaryFor(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): ConfigSummary | null {
  if (tipo === "evento") return eventoSummary(config)
  if (tipo === "ramificacion_valor") return ramificacionValorSummary(config)
  if (tipo === "split_ab") return splitAbSummary(config)
  if (tipo === "condicion_multiple") return condicionMultipleSummary(config)
  if (tipo === "acumular_puntos") return acumularPuntosSummary(config)
  if (tipo === "webhook_saliente") return webhookSalienteSummary(config)
  if (isMessageNodeType(tipo)) return null
  return genericSummary(tipo, config)
}
