"use server"

import { revalidatePath } from "next/cache"

import { settingsActionClient } from "./action-client"
import { programParametersSchema } from "../schemas"

export const updateProgramParametersAction = settingsActionClient
  .inputSchema(programParametersSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase.from("programa_parametros").upsert(
      {
        org_id: ctx.orgId,
        valor_punto: parsedInput.valorPunto,
        breakage_estimado_pct: parsedInput.breakageEstimadoPct,
        redencion_cashback_pct: parsedInput.redencionCashbackPct,
        techo_descuento_apilado_pct: parsedInput.techoDescuentoApiladoPct,
        vigencia_puntos_dias: parsedInput.vigenciaPuntosDias ?? null,
        exclusiones_reglamento: parsedInput.exclusionesReglamento,
      },
      { onConflict: "org_id" }
    )

    if (error) return { ok: false as const, message: "No se pudo guardar." }

    revalidatePath("/ajustes/programa")
    return { ok: true as const }
  })
