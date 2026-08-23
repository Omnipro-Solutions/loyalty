"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

const syncAudienceSchema = z.object({ segmentId: z.string().uuid() })

/** "Sincronizar ahora" (11.2): sin AJO real conectado, esto marca la audiencia como sincronizada y actualiza el timestamp — el mismo efecto observable que el propio Figma pinta, sin fingir una llamada a un sistema externo que no existe. */
export const syncAudienceAction = actionClient
  .inputSchema(syncAudienceSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const { error } = await supabase
      .from("segments")
      .update({
        sincronizado_con_ajo: true,
        ultima_sincronizacion_en: new Date().toISOString(),
      })
      .eq("id", parsedInput.segmentId)
    if (error) throw error

    revalidatePath(`/audiencias/${parsedInput.segmentId}`)
    revalidatePath("/audiencias")
    return { ok: true as const }
  })
