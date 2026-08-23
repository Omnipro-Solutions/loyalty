"use server"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

import { revokeTrustedDeviceSchema } from "../schemas"

export const revokeTrustedDeviceAction = actionClient
  .inputSchema(revokeTrustedDeviceSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return {
        ok: false as const,
        message: "Sesión expirada, inicia sesión de nuevo.",
      }
    }

    const { error } = await supabase
      .from("trusted_devices")
      .delete()
      .eq("id", parsedInput.id)
      .eq("profile_id", user.id)

    if (error) {
      return {
        ok: false as const,
        message: "No se pudo revocar el dispositivo.",
      }
    }
    return { ok: true as const }
  })
