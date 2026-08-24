import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * Confirma los enlaces de correo de recuperación de contraseña y de
 * activación de cuenta (invitación) — `supabase/templates/recovery.html` y
 * `supabase/templates/invite.html` apuntan aquí con `token_hash`/`type`.
 *
 * A propósito NO usa el intercambio PKCE (`exchangeCodeForSession`, como
 * `src/app/auth/callback/route.ts` para OAuth): PKCE exige que quien
 * complete el intercambio sea el mismo navegador/sesión que originó la
 * solicitud, y una invitación la origina la persona que invita, no quien la
 * recibe — nunca habría un `code_verifier` que coincida. `verifyOtp` con
 * `token_hash` no tiene esa restricción: el token del correo es la única
 * prueba necesaria, funciona igual para recovery e invite.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/resumen"

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=enlace_invalido`)
}
