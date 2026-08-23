import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * Callback de OAuth (Entra ID, 01.4). El intercambio de código dispara
 * `handle_new_user()` en el primer login de un usuario — si el dominio del
 * correo no tiene organización, el trigger lanza excepción y la transacción
 * de creación de usuario falla, lo que hace fallar el intercambio de código
 * aquí. Es la aproximación más cercana disponible hoy a
 * "SSO_USER_NOT_PROVISIONED" (01.5) — el schema actual no distingue
 * "dominio sin organización" de "dominio con organización pero sin rol
 * asignado explícitamente"; ambos casos aterrizan en la misma pantalla.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/resumen`)
    }
  }

  return NextResponse.redirect(`${origin}/sso/no-autorizado`)
}
