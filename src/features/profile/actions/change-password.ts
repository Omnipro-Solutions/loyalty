"use server"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

import { changePasswordSchema } from "../schemas"

export const changePasswordAction = actionClient
  .inputSchema(changePasswordSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return {
        ok: false as const,
        message: "Sesión expirada, inicia sesión de nuevo.",
      }
    }

    // Supabase no exige la contraseña actual para `updateUser` — se verifica
    // aquí a mano (re-autenticando) para no dejar cambiar la contraseña con
    // solo una sesión ya abierta.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsedInput.currentPassword,
    })
    if (verifyError) {
      return {
        ok: false as const,
        message: "La contraseña actual no es correcta.",
      }
    }

    const { error } = await supabase.auth.updateUser({
      password: parsedInput.newPassword,
    })
    if (error) {
      return {
        ok: false as const,
        message: "No se pudo actualizar la contraseña.",
      }
    }
    return { ok: true as const }
  })
