"use server"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

import { establishSessionSchema } from "../schemas"

/**
 * Convierte los tokens del flujo implícito (fragmento de la URL, ver
 * `link-callback-card.tsx`) en la sesión de cookies que espera el resto de
 * la app — `setSession` desde una Server Action sí puede escribirlas
 * (a diferencia de un Server Component, ver `lib/supabase/server.ts`).
 */
export const establishSessionAction = actionClient
  .inputSchema(establishSessionSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const { error } = await supabase.auth.setSession({
      access_token: parsedInput.accessToken,
      refresh_token: parsedInput.refreshToken,
    })
    if (error) {
      return { ok: false as const }
    }
    return { ok: true as const }
  })
