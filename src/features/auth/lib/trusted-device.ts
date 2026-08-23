import { createHash, randomBytes } from "node:crypto"
import type { cookies } from "next/headers"

import { createClient } from "@/lib/supabase/server"

/** Cookie con el token en claro del dispositivo confiado (01.1/01.2). */
export const TRUSTED_DEVICE_COOKIE = "ls_td"
/** Cookie corta que lleva la intención "recordar dispositivo" del login (01.1) hasta la verificación (01.2). */
export const REMEMBER_INTENT_COOKIE = "ls_remember_intent"

export const TRUSTED_DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function generateDeviceToken() {
  return randomBytes(32).toString("hex")
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Si el usuario pidió "recordar este dispositivo" (en 01.1 o en 01.2, ver
 * `REMEMBER_INTENT_COOKIE`) o marcó "no volver a pedir código" al verificar,
 * crea el registro en `trusted_devices` y la cookie httpOnly con el token en
 * claro. `proxy.ts` es quien luego decide con esto si puede saltarse 2FA —
 * el AAL nativo de Supabase no tiene este concepto (ver comentario en
 * src/lib/supabase/proxy.ts).
 */
export async function persistTrustedDeviceIfRequested({
  cookieStore,
  profileId,
  doNotAskAgain,
}: {
  cookieStore: Awaited<ReturnType<typeof cookies>>
  profileId: string
  doNotAskAgain: boolean
}) {
  const rememberIntent = cookieStore.get(REMEMBER_INTENT_COOKIE)?.value === "1"
  cookieStore.delete(REMEMBER_INTENT_COOKIE)

  if (!rememberIntent && !doNotAskAgain) return

  const supabase = await createClient()
  const token = generateDeviceToken()
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_MAX_AGE_SECONDS * 1000)

  await supabase.from("trusted_devices").insert({
    profile_id: profileId,
    token_hash: hashToken(token),
    expira_en: expiresAt.toISOString(),
  })

  cookieStore.set(TRUSTED_DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
    path: "/",
  })
}
