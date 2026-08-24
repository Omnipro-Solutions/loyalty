"use server"

import { cookies } from "next/headers"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

import {
  REMEMBER_INTENT_COOKIE,
  TRUSTED_DEVICE_COOKIE,
  hashToken,
} from "../lib/trusted-device"
import { loginSchema } from "../schemas"

export const loginAction = actionClient
  .inputSchema(loginSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const cookieStore = await cookies()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsedInput.email,
      password: parsedInput.password,
    })

    if (error || !data.user) {
      return { ok: false as const, message: "Correo o contraseña incorrectos." }
    }

    // Lleva la intención de "recordar este dispositivo" hasta la
    // verificación TOTP, donde se decide si de verdad se puede confiar en
    // el dispositivo (solo tras completar 2FA).
    cookieStore.set(
      REMEMBER_INTENT_COOKIE,
      parsedInput.rememberDevice ? "1" : "0",
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
      }
    )

    // MFA es opcional (ver comentario en src/lib/supabase/proxy.ts): si el
    // usuario nunca enroló un factor verificado, `nextLevel` se queda igual
    // a `currentLevel` y no hay a qué subir — no tiene sentido mandarlo a
    // /verificacion.
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel === aal?.nextLevel) {
      return { ok: true as const, needsVerification: false as const }
    }

    // Dispositivo ya confiado de un login anterior: si el token de la
    // cookie coincide con un registro vigente, `proxy.ts` deja pasar sin
    // pedir 2FA de nuevo (ver src/lib/supabase/proxy.ts).
    const existingToken = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value
    if (existingToken) {
      const { data: device } = await supabase
        .from("trusted_devices")
        .select("id, expira_en")
        .eq("profile_id", data.user.id)
        .eq("token_hash", hashToken(existingToken))
        .gt("expira_en", new Date().toISOString())
        .maybeSingle()

      if (device) {
        return { ok: true as const, needsVerification: false as const }
      }
    }

    return { ok: true as const, needsVerification: true as const }
  })
