"use server"

import { z } from "zod"

import { builderActionClient } from "../canvas/action-client"
import {
  anotarConteos,
  type GrupoCondiciones,
  type MiembroPreview,
  type SiFaltaElDato,
} from "./condicion-preview"

const reglaSchema = z
  .object({
    id: z.string().optional(),
    field: z.string(),
    operator: z.string(),
    value: z.union([z.string(), z.number()]),
    valueSource: z.string().optional(),
  })
  .passthrough()

const grupoSchema: z.ZodType<GrupoCondiciones> = z.lazy(() =>
  z
    .object({
      id: z.string().optional(),
      combinator: z.enum(["and", "or"]),
      not: z.boolean().optional(),
      rules: z.array(z.union([reglaSchema, grupoSchema])),
    })
    .passthrough()
)

/**
 * "Resultado estimado" del inspector de `condicion_multiple` (Figma
 * `1114:4478`): a diferencia del resto de métricas de la app (siempre "—"
 * cuando no hay dato real detrás), esta SÍ se puede calcular de verdad — la
 * tabla `members` ya existe con datos reales y sus columnas calzan 1:1 con
 * los campos que expone el condition builder. Trae todos los socios de la
 * org (RLS ya los limita) y evalúa el árbol en JS (`condicion-preview.ts`)
 * en vez de traducirlo a un filtro Postgrest — mismo enfoque que
 * `engine/simulate.ts` ya usa para el motor de simulación del builder, y
 * evita construir/mantener un traductor de árbol AND/OR anidado a SQL para
 * un puñado de socios.
 */
export const previsualizarCondicionAction = builderActionClient
  .inputSchema(
    z.object({
      condiciones: grupoSchema,
      siFaltaElDato: z
        .enum(["no_cumple", "si_cumple", "omitir"])
        .default("no_cumple"),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const { data: members, error } = await ctx.supabase.from("members").select(`
        saldo_puntos, fecha_alta, genero, canal_adquisicion, estado_cuenta,
        tiene_hijos, tiene_mascotas, consentimiento_marketing, provincia,
        tiers(nombre)
      `)

    if (error) {
      return { ok: false as const, message: "No se pudo consultar socios." }
    }

    const miembros: MiembroPreview[] = (members ?? []).map((m) => ({
      tier: m.tiers?.nombre ?? null,
      saldo_puntos: m.saldo_puntos,
      fecha_alta: m.fecha_alta,
      genero: m.genero,
      canal_adquisicion: m.canal_adquisicion,
      estado_cuenta: m.estado_cuenta,
      tiene_hijos: m.tiene_hijos,
      tiene_mascotas: m.tiene_mascotas,
      consentimiento_marketing: m.consentimiento_marketing,
      provincia: m.provincia,
    }))

    const siFaltaElDato: SiFaltaElDato = parsedInput.siFaltaElDato
    const conteos = anotarConteos(
      parsedInput.condiciones,
      miembros,
      siFaltaElDato
    )

    return { ok: true as const, totalMiembros: miembros.length, conteos }
  })
