"use server"

import { actionClient } from "@/lib/safe-action"
import { getSiteOrigin } from "@/lib/site-origin"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

import { passwordResetSchema, setPasswordSchema } from "../schemas"

export const requestPasswordResetAction = actionClient
  .inputSchema(passwordResetSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const origin = await getSiteOrigin()
    // Nunca revela si el correo existe o no (evita enumeración de cuentas):
    // el resultado que ve el usuario es siempre el mismo mensaje genérico.
    // El plan Free sin SMTP propio no permite personalizar la plantilla de
    // recovery (ver DEPLOY.md 4.1), así que usa el flujo implícito de
    // siempre: `redirectTo` apunta a /verificando-enlace, que recibe los
    // tokens de sesión en el fragmento de la URL y de ahí manda a
    // /restablecer-contrasena (ver link-callback-card.tsx).
    await supabase.auth.resetPasswordForEmail(parsedInput.email, {
      redirectTo: `${origin}/verificando-enlace`,
    })
    return { ok: true as const }
  })

/**
 * Fija la contraseña tras un enlace de recuperación o de activación de
 * cuenta — ambos aterrizan en /verificando-enlace
 * (`link-callback-card.tsx`), que ya deja al usuario con una sesión válida
 * vía `establishSessionAction`. `updateUser` no exige la contraseña
 * anterior porque en este punto no existe una todavía (o no se conoce,
 * caso recovery).
 */
export const setNewPasswordAction = actionClient
  .inputSchema(setPasswordSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const user = await getAuthenticatedUser()
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
