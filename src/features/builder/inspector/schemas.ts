import { z } from "zod"

import { findEvent } from "@/config/event-catalog"
import { isMessageNodeType } from "@/config/integration-flows"
import type { BuilderNodeType } from "@/types/domain"

import {
  isBlankValue,
  isSpecRequired,
  SIMPLE_FIELD_SPECS,
  type FieldSpec,
} from "./field-specs"

function fieldSchema(spec: FieldSpec) {
  let base: z.ZodTypeAny
  switch (spec.kind) {
    case "number":
    case "currency":
      base = z.number()
      if (spec.kind === "number" && typeof spec.min === "number")
        base = (base as z.ZodNumber).min(spec.min)
      break
    case "select":
      base = z.enum(spec.options.map((o) => o.value) as [string, ...string[]])
      break
    // Sus opciones dependen de otro campo del mismo bloque (el dominio, el
    // evento), así que no hay una lista cerrada que enumerar aquí. Lo que
    // sí se valida —que el id exista en el catálogo, que el modo sea uno de
    // los que ese evento admite— vive en `withEventCatalogChecks`, donde ya
    // se ve el objeto completo.
    case "event-select":
    case "trigger-mode-select":
      base = z.string().min(1)
      break
    // Mismo motivo que los dos de arriba —sus opciones salen del dominio
    // elegido, no de una lista fija— pero el valor es una lista de ids, no
    // uno solo. Sin este case caía en el `default` (`z.string()`) y un
    // bloque con disparadores adicionales elegidos se reportaba como
    // "campo obligatorio sin completar".
    case "additional-events":
      base = z.array(z.string().min(1))
      break
    case "multiselect":
      base = z.array(
        z.enum(spec.options.map((o) => o.value) as [string, ...string[]])
      )
      break
    case "boolean":
      base = z.boolean()
      break
    case "time-range":
      base = z.object({
        desde: z.string().optional(),
        hasta: z.string().optional(),
      })
      break
    default:
      base = z.string()
  }
  const isRequired = "required" in spec && spec.required
  return isRequired ? base : base.optional()
}

function specsSchema(specs: FieldSpec[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const spec of specs) shape[spec.key] = fieldSchema(spec)
  return z.object(shape)
}

/**
 * Aplica la obligatoriedad condicional (`FieldSpec.requiredWhen`) sobre el
 * schema ya construido: un campo que solo hace falta cuando otro tiene
 * cierto valor no se puede expresar en la forma del objeto, porque depende
 * del valor que se está validando.
 *
 * Se envuelve al final de `nodeConfigSchemaFor` y no dentro de
 * `specsSchema` porque varios bloques necesitan `.extend()` sobre el objeto
 * (headers del webhook, ramas de la ramificación) y `.superRefine` ya no
 * devuelve un `ZodObject`.
 *
 * El `path` de cada issue es la clave del campo, que es exactamente lo que
 * `validateNodeConfig` traduce a su label del catálogo — así un campo
 * condicional aparece en el aviso del nodo igual que uno obligatorio fijo.
 */
function withConditionalRequirements(
  schema: z.ZodTypeAny,
  specs: FieldSpec[]
): z.ZodTypeAny {
  const conditional = specs.filter(
    (spec) => "requiredWhen" in spec && spec.requiredWhen
  )
  if (!conditional.length) return schema
  return schema.superRefine((value, ctx) => {
    const config = (value ?? {}) as Record<string, unknown>
    for (const spec of conditional) {
      if (!isSpecRequired(spec, config)) continue
      if (!isBlankValue(config[spec.key])) continue
      ctx.addIssue({
        code: "custom",
        path: [spec.key],
        message: "Obligatorio con la configuración actual del bloque",
      })
    }
  })
}

export const branchSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().min(0).optional(),
})

// El default espeja el que usa `BranchesTab` al montar sin `config.branches`
// todavía — un nodo recién soltado que nunca abrió la pestaña Ramas no debe
// contar como "incompleto" (`OUTPUT_HANDLES`/el simulador ya asumen ese
// mismo par por defecto para poder conectarlo y correr Simular).
export const branchesConfigSchema = z.object({
  branches: z
    .array(branchSchema)
    .min(1, "Agrega al menos una rama")
    .default([
      { id: "rama_1", label: "Rama 1", weight: 50 },
      { id: "por_defecto", label: "Por defecto", weight: 50 },
    ]),
})

// Misma forma que `ConditionRule` de `condition-preview.ts` — un solo tipo
// de regla en todo el builder, aquí redeclarado en Zod (ese archivo no
// exporta un schema, solo el tipo TS).
const conditionRuleSchema = z.object({
  id: z.string(),
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.union([z.string(), z.number()]),
})

const modifierSchema = z.object({
  id: z.string(),
  rule: conditionRuleSchema,
  multiplier: z.number().min(0),
  previewActive: z.boolean(),
})

const pointsBonusSchema = z.object({
  id: z.string(),
  rule: conditionRuleSchema,
  points: z.number(),
  previewActive: z.boolean(),
})

const invoiceBonusSchema = z.object({
  id: z.string(),
  rules: z.array(conditionRuleSchema).min(1),
  points: z.number(),
  previewActive: z.boolean(),
})

export const accumulatePointsConfigSchema = z.object({
  multiplierOverride: z.number().min(0).optional(),
  capPerTransaction: z.number().min(0).optional(),
  accumulatedCap: z.number().min(0).optional(),
  amountUnit: z.number().min(0.01).default(0.25),
  exampleAmount: z.number().min(0).default(12.5),
  exampleTierName: z
    .enum(["bronce", "plata", "oro", "diamante"])
    .default("oro"),
  exampleQuantity: z.number().min(1).default(1),
  // Condición interna (docs/builder.md §8/§27): modificadores multiplican,
  // bonos suman — cada uno con su propia política de combinación cuando hay
  // más de uno activo (§13). Todos con default vacío/neutro para que un
  // nodo sin modificadores/bonos configurados siga siendo válido (mismo
  // criterio que el resto de `nodeConfigSchemaFor`).
  modifiers: z.array(modifierSchema).default([]),
  modifiersPolicy: z
    .enum(["mayor", "multiplicativo", "incremental"])
    .default("multiplicativo"),
  itemBonuses: z.array(pointsBonusSchema).default([]),
  invoiceBonuses: z.array(invoiceBonusSchema).default([]),
  bonusPolicy: z
    .enum(["acumular_todas", "mayor_prioridad", "primera_coincidencia"])
    .default("acumular_todas"),
})

// Misma forma que `segments.condiciones` (ver comentario de esa columna en
// `supabase/migrations/..._socios_niveles_ledger.sql`): el árbol que
// produce `react-querybuilder` en el cliente, guardado tal cual.
export const multiConditionConfigSchema = z.object({
  condiciones: z.record(z.string(), z.unknown()).default({
    combinator: "and",
    rules: [],
  }),
})

// `webhook_saliente` (ver `WebhookSalienteForm`,
// `inspector/webhook-saliente-form.tsx`): headers y cuerpo son listas
// dinámicas de longitud variable — no caben en `FieldSpec[]`, mismo motivo
// que `branchesConfigSchema` abajo modela `branches` aparte.
const webhookHeaderSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  value: z.string(),
})

// `campo` es el nombre del key que va en el body JSON enviado; `variable`
// es el nombre de una variable del grafo (`GraphVariable.name`, ver
// `node-variables.ts`) elegida vía `FieldSlashAutocomplete` — mismo
// concepto que `mapeo` en `messageActionConfigSchema` de abajo, pero como
// lista (acá no hay un `flow.parameters` fijo del que derivar las filas).
const webhookBodyFieldSchema = z.object({
  id: z.string().min(1),
  campo: z.string().min(1),
  variable: z.string(),
})

export const webhookSalienteConfigSchema = specsSchema(
  SIMPLE_FIELD_SPECS.webhook_saliente ?? []
).extend({
  headers: z.array(webhookHeaderSchema).default([]),
  cuerpo: z.array(webhookBodyFieldSchema).default([]),
})

/**
 * `email`/`push`/`sms_whatsapp` (ver `IntegrationMessageForm`): proveedor +
 * flujo elegidos del catálogo de `config/integration-flows.ts`, más el
 * mapeo de parámetros del flujo a variables del journey. Se compone con el
 * schema de `MESSAGE_GUARDRAIL_SPECS` (vía `specsSchema`) en
 * `nodeConfigSchemaFor` — este objeto solo cubre lo que no es un `FieldSpec`.
 */
function messageActionConfigSchema(specs: FieldSpec[]) {
  return specsSchema(specs).extend({
    integracion_id: z.string().min(1).optional(),
    flujo_id: z.string().min(1).optional(),
    mapeo: z.record(z.string(), z.string()).optional(),
  })
}

/**
 * Un schema por tipo de bloque, mapeado por `tipo` en vez de una unión
 * discriminada literal: `config` vive en una columna separada de `tipo` en
 * `workflow_nodes` (no es un campo dentro del objeto a validar), así que
 * el discriminante real es externo al valor — un lookup por `tipo` logra
 * exactamente lo mismo que una unión discriminada (un schema específico
 * por variante) sin forzar un `tipo` duplicado dentro de `config`.
 */
/**
 * Coherencia contra el catálogo de eventos. Son dos comprobaciones que la
 * forma del objeto no puede expresar, y que sin ellas dejan pasar config
 * que se ve completa y no lo está:
 *
 * 1. Un `evento_id` que no está en el catálogo — típicamente de un catálogo
 *    anterior, o quedado tras cambiar de dominio. El nodo se vería
 *    configurado y el motor escucharía algo que nadie emite.
 * 2. Un `modo_disparo` que el evento elegido no admite (un alta de socio
 *    "al cruzar un umbral"). El selector no lo ofrece, pero la config vieja
 *    sí puede traerlo.
 */
function withEventCatalogChecks(
  schema: z.ZodTypeAny,
  tipo: BuilderNodeType
): z.ZodTypeAny {
  if (tipo !== "evento" && tipo !== "emitir_evento") return schema
  return schema.superRefine((value, ctx) => {
    const config = (value ?? {}) as Record<string, unknown>
    const eventId = config.evento_id
    if (typeof eventId !== "string" || !eventId) return

    const event = findEvent(eventId)
    if (!event) {
      ctx.addIssue({
        code: "custom",
        path: ["evento_id"],
        message: "El evento elegido ya no está en el catálogo",
      })
      return
    }
    if (tipo !== "evento") return

    const modo = config.modo_disparo
    if (
      typeof modo === "string" &&
      !event.triggerModes.includes(modo as never)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["modo_disparo"],
        message: `«${event.label}» no admite ese modo de disparo`,
      })
    }
  })
}

export function nodeConfigSchemaFor(tipo: BuilderNodeType): z.ZodTypeAny {
  if (tipo === "acumular_puntos") return accumulatePointsConfigSchema
  if (tipo === "condicion_multiple") return multiConditionConfigSchema

  const specs = SIMPLE_FIELD_SPECS[tipo] ?? []
  const base =
    tipo === "webhook_saliente"
      ? webhookSalienteConfigSchema
      : tipo === "ramificacion_valor" || tipo === "split_ab"
        ? // `branchesConfigSchema` por sí solo solo cubre la pestaña Ramas —
          // sin este `.extend`, los campos obligatorios de la pestaña
          // Configuración (`atributo_evaluado`/`modo` en ramificación por
          // valor, `criterio_exito` en split A/B) nunca se validaban.
          branchesConfigSchema.extend(specsSchema(specs).shape)
        : isMessageNodeType(tipo)
          ? messageActionConfigSchema(specs)
          : specsSchema(specs)

  return withEventCatalogChecks(withConditionalRequirements(base, specs), tipo)
}

/**
 * Campos obligatorios (`FieldSpec.required`) sin completar en `config`, ya
 * traducidos al label humano del catálogo (`SIMPLE_FIELD_SPECS`) — una sola
 * fuente de verdad compartida entre `validateGraph` (bloquea Publicar) y el
 * badge de advertencia de `BuilderNode` en el canvas. `[]` = nodo completo.
 */
export function validateNodeConfig(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): string[] {
  const result = nodeConfigSchemaFor(tipo).safeParse(config)
  if (result.success) return []

  const labelByKey = new Map(
    (SIMPLE_FIELD_SPECS[tipo] ?? []).map((spec) => [spec.key, spec.label])
  )
  const labels = new Set<string>()
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "")
    labels.add(labelByKey.get(key) ?? key)
  }
  return [...labels]
}
