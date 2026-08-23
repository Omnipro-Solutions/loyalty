"use server"

import { cookies } from "next/headers"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

import { generateBackupCodes, hashBackupCode } from "../lib/backup-codes"
import {
  TRUSTED_DEVICE_COOKIE,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
  generateDeviceToken,
  hashToken,
  persistTrustedDeviceIfRequested,
} from "../lib/trusted-device"
import { verifyBackupCodeSchema, verifyTotpSchema } from "../schemas"

const BACKUP_CODE_SESSION_TRUST_SECONDS = 60 * 60 * 24 // 1 día si no marcó "no volver a pedir código"

/**
 * Estado de la verificación en dos pasos para el usuario actual: si ya
 * tiene un factor TOTP verificado, hay que pedir el código (pantalla
 * 01.2 tal cual el Figma); si no, hay que enrolarlo primero (QR + secreto)
 * — el Figma no tiene una pantalla separada para esto, así que se muestra
 * como una sección adicional sobre la misma tarjeta 01.2.
 */
export async function getMfaStatus() {
  const supabase = await createClient()
  const { data } = await supabase.auth.mfa.listFactors()
  // `data.totp` solo trae factores YA verificados (así lo tipa/devuelve
  // supabase-js) — no hace falta filtrar por status aquí.
  const verified = data?.totp[0]
  return verified
    ? { enrolled: true as const, factorId: verified.id }
    : { enrolled: false as const }
}

export const enrollTotpAction = actionClient.action(async () => {
  const supabase = await createClient()

  // Limpia intentos de enrolamiento anteriores sin verificar (recarga de
  // página, etc.) para no acumular factores huérfanos. `data.all` incluye
  // verificados y no verificados; `data.totp` (ver arriba) solo trae los ya
  // verificados.
  const { data: existing } = await supabase.auth.mfa.listFactors()
  await Promise.all(
    (existing?.all ?? [])
      .filter((f) => f.factor_type === "totp" && f.status === "unverified")
      .map((f) => supabase.auth.mfa.unenroll({ factorId: f.id }))
  )

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" })
  if (error || !data) {
    return {
      ok: false as const,
      message: "No se pudo iniciar el enrolamiento.",
    }
  }

  return {
    ok: true as const,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
})

export const verifyTotpAction = actionClient
  .inputSchema(verifyTotpSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const cookieStore = await cookies()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return {
        ok: false as const,
        message: "Sesión expirada, inicia sesión de nuevo.",
      }
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: parsedInput.factorId,
      code: parsedInput.code,
    })
    if (error) {
      return { ok: false as const, message: "Código incorrecto o expirado." }
    }

    const { data: existingCodes } = await supabase
      .from("mfa_backup_codes")
      .select("id")
      .eq("profile_id", user.id)
      .limit(1)

    let backupCodes: string[] | undefined
    if (!existingCodes?.length) {
      backupCodes = generateBackupCodes()
      await supabase.from("mfa_backup_codes").insert(
        backupCodes.map((code) => ({
          profile_id: user.id,
          code_hash: hashBackupCode(code),
        }))
      )
    }

    await persistTrustedDeviceIfRequested({
      cookieStore,
      profileId: user.id,
      doNotAskAgain: parsedInput.doNotAskAgain,
    })

    return { ok: true as const, backupCodes }
  })

/**
 * Los códigos de respaldo son una tabla propia, no un factor nativo de
 * Supabase MFA — verificarlos no puede promover el AAL de la sesión a aal2
 * vía la API de Supabase (esa promoción solo ocurre en `challengeAndVerify`
 * con un factor real). Por eso, igual que con "dispositivo confiado", la
 * verificación exitosa se registra como un `trusted_devices` propio: es la
 * única forma de que `proxy.ts` (que si consulta ese estado) reconozca la
 * sesión como completa. Ver src/lib/supabase/proxy.ts.
 */
export const verifyBackupCodeAction = actionClient
  .inputSchema(verifyBackupCodeSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const cookieStore = await cookies()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return {
        ok: false as const,
        message: "Sesión expirada, inicia sesión de nuevo.",
      }
    }

    const codeHash = hashBackupCode(parsedInput.code)
    const { data: match } = await supabase
      .from("mfa_backup_codes")
      .select("id")
      .eq("profile_id", user.id)
      .eq("code_hash", codeHash)
      .is("usado_en", null)
      .maybeSingle()

    if (!match) {
      return {
        ok: false as const,
        message: "Código de respaldo inválido o ya usado.",
      }
    }

    await supabase
      .from("mfa_backup_codes")
      .update({ usado_en: new Date().toISOString() })
      .eq("id", match.id)

    // A diferencia de `challengeAndVerify` (TOTP), verificar un código de
    // respaldo no promueve el AAL nativo de la sesión — así que sin esto,
    // `proxy.ts` mandaría de vuelta a /verificacion en un bucle. Si no pidió
    // "no volver a pedir código", el dispositivo igual queda confiado por
    // 1 día (suficiente para la sesión actual) en vez de los 30 días del
    // opt-in explícito.
    const maxAge = parsedInput.doNotAskAgain
      ? TRUSTED_DEVICE_MAX_AGE_SECONDS
      : BACKUP_CODE_SESSION_TRUST_SECONDS
    const token = generateDeviceToken()
    await supabase.from("trusted_devices").insert({
      profile_id: user.id,
      token_hash: hashToken(token),
      expira_en: new Date(Date.now() + maxAge * 1000).toISOString(),
    })
    cookieStore.set(TRUSTED_DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge,
      path: "/",
    })

    return { ok: true as const, backupCodes: undefined }
  })
