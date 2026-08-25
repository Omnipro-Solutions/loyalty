import { createClient } from "@/lib/supabase/server"

/**
 * Antes vivía hardcodeado como `POINT_VALUE_USD` en
 * `features/members/lib/queries.ts` — se usa como fallback mientras una
 * organización no tenga fila en `programa_parametros` (no debería pasar
 * en la práctica: `seed.sql` siembra una para el tenant de demo, y toda
 * organización nueva debería recibir una por defecto).
 */
export const DEFAULT_POINT_VALUE_USD = 0.0017

export type ProgramParameters = {
  valorPunto: number
  breakageEstimadoPct: number
  redencionCashbackPct: number
  techoDescuentoApiladoPct: number
  vigenciaPuntosDias: number | null
  exclusionesReglamento: string[]
  topesCatalogo: unknown[]
}

const DEFAULT_PROGRAM_PARAMETERS: ProgramParameters = {
  valorPunto: DEFAULT_POINT_VALUE_USD,
  breakageEstimadoPct: 0,
  redencionCashbackPct: 0,
  techoDescuentoApiladoPct: 50,
  vigenciaPuntosDias: null,
  exclusionesReglamento: [],
  topesCatalogo: [],
}

/**
 * Parámetros de organización compartidos por `features/members` y
 * `features/promotions` (entre otros) — vive en `lib/` porque las
 * features no pueden importarse entre sí (CLAUDE.md §2).
 */
export async function getProgramParameters(): Promise<ProgramParameters> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("programa_parametros")
    .select(
      "valor_punto, breakage_estimado_pct, redencion_cashback_pct, techo_descuento_apilado_pct, vigencia_puntos_dias, exclusiones_reglamento, topes_catalogo"
    )
    .maybeSingle()
  if (error) throw error
  if (!data) return DEFAULT_PROGRAM_PARAMETERS

  return {
    valorPunto: data.valor_punto,
    breakageEstimadoPct: data.breakage_estimado_pct,
    redencionCashbackPct: data.redencion_cashback_pct,
    techoDescuentoApiladoPct: data.techo_descuento_apilado_pct,
    vigenciaPuntosDias: data.vigencia_puntos_dias,
    exclusionesReglamento: data.exclusiones_reglamento,
    topesCatalogo: Array.isArray(data.topes_catalogo)
      ? data.topes_catalogo
      : [],
  }
}
