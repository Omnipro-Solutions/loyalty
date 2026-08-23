"use server"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

import { passwordResetSchema } from "../schemas"

export const requestPasswordResetAction = actionClient
  .inputSchema(passwordResetSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    // Nunca revela si el correo existe o no (evita enumeración de cuentas):
    // el resultado que ve el usuario es siempre el mismo mensaje genérico.
    await supabase.auth.resetPasswordForEmail(parsedInput.email)
    return { ok: true as const }
  })
