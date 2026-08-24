"use server"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

import { passwordResetSchema, setPasswordSchema } from "../schemas"

export const requestPasswordResetAction = actionClient
  .inputSchema(passwordResetSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    // Nunca revela si el correo existe o no (evita enumeración de cuentas):
    // el resultado que ve el usuario es siempre el mismo mensaje genérico.
    // El link de recuperación lo construye la plantilla de correo de
    // Supabase (supabase/templates/recovery.html) con `next` fijo a
    // /restablecer-contrasena — no depende de `redirectTo` aquí.
    await supabase.auth.resetPasswordForEmail(parsedInput.email)
    return { ok: true as const }
  })

/**
 * Fija la contraseña tras un enlace de recuperación o de activación de
 * cuenta — ambos aterrizan en `src/app/auth/confirm/route.ts`, que ya deja
 * al usuario con una sesión válida vía `verifyOtp`. `updateUser` no exige
 * la contraseña anterior porque en este punto no existe una todavía (o no
 * se conoce, caso recovery).
 */
export const setNewPasswordAction = actionClient
  .inputSchema(setPasswordSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return {
        ok: false as const,
        message: "El enlace expiró o ya se usó. Solicita uno nuevo.",
      }
    }

    const { error } = await supabase.auth.updateUser({
      password: parsedInput.password,
    })
    if (error) {
      return {
        ok: false as const,
        message: "No se pudo guardar la contraseña.",
      }
    }
    return { ok: true as const }
  })
