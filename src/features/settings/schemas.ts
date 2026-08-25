import { z } from "zod"

import { REGULATION_EXCLUSIONS } from "@/types/domain"

export const programParametersSchema = z.object({
  valorPunto: z.number().positive("Ingresa un valor mayor a 0"),
  breakageEstimadoPct: z.number().min(0).max(100),
  redencionCashbackPct: z.number().min(0).max(100),
  techoDescuentoApiladoPct: z.number().min(0).max(100),
  vigenciaPuntosDias: z.number().int().positive().optional(),
  exclusionesReglamento: z.array(z.enum(REGULATION_EXCLUSIONS)),
})

export type ProgramParametersValues = z.infer<typeof programParametersSchema>
