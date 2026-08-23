import { z } from "zod"

import type { BuilderNodeType } from "@/types/domain"

import { SIMPLE_FIELD_SPECS, type FieldSpec } from "./field-specs"

function schemaDeCampo(spec: FieldSpec) {
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
  const esRequerido = "required" in spec && spec.required
  return esRequerido ? base : base.optional()
}

function schemaDeEspecificaciones(specs: FieldSpec[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const spec of specs) shape[spec.key] = schemaDeCampo(spec)
  return z.object(shape)
}

export const ramaSchema = z.object({
  id: z.string().min(1),
  etiqueta: z.string().min(1),
  peso: z.number().min(0).optional(),
})

export const ramasConfigSchema = z.object({
  ramas: z.array(ramaSchema).min(1, "Agrega al menos una rama"),
})

export const acumularPuntosConfigSchema = z.object({
  multiplicador_override: z.number().min(0).optional(),
  tope_por_transaccion: z.number().min(0).optional(),
  tope_acumulado: z.number().min(0).optional(),
  unidad_monto: z.number().min(1).default(1000),
  monto_ejemplo: z.number().min(0).default(50000),
  tier_ejemplo: z.enum(["bronce", "plata", "oro", "diamante"]).default("oro"),
})

// Misma forma que `segments.condiciones` (ver comentario de esa columna en
// `supabase/migrations/..._socios_niveles_ledger.sql`): el árbol que
// produce `react-querybuilder` en el cliente, guardado tal cual.
export const condicionMultipleConfigSchema = z.object({
  condiciones: z.record(z.string(), z.unknown()).default({
    combinator: "and",
    rules: [],
  }),
})

/**
 * Un schema por tipo de bloque, mapeado por `tipo` en vez de una unión
 * discriminada literal: `config` vive en una columna separada de `tipo` en
 * `workflow_nodes` (no es un campo dentro del objeto a validar), así que
 * el discriminante real es externo al valor — un lookup por `tipo` logra
 * exactamente lo mismo que una unión discriminada (un schema específico
 * por variante) sin forzar un `tipo` duplicado dentro de `config`.
 */
export function nodeConfigSchemaFor(tipo: BuilderNodeType): z.ZodTypeAny {
  if (tipo === "acumular_puntos") return acumularPuntosConfigSchema
  if (tipo === "condicion_multiple") return condicionMultipleConfigSchema
  if (tipo === "ramificacion_valor" || tipo === "split_ab") {
    return ramasConfigSchema
  }
  const specs = SIMPLE_FIELD_SPECS[tipo] ?? []
  return schemaDeEspecificaciones(specs)
}
