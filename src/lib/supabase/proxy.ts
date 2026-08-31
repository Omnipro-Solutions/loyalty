import { createHash } from "node:crypto"

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/types/database.types"

const TRUSTED_DEVICE_COOKIE = "ls_td"

function isAppRoute(pathname: string) {
  return (
    pathname !== "/login" &&
    !pathname.startsWith("/login/") &&
    !pathname.startsWith("/verificacion") &&
    !pathname.startsWith("/sso") &&
    !pathname.startsWith("/ds") &&
    !pathname.startsWith("/api") &&
    // Página pública tipo statuspage.io (`src/app/estado/page.tsx`) — debe
    // poder consultarse incluso si el login está caído. Match estricto
    // (no `startsWith` suelto) para no abrir sin querer `/estado-lo-que-sea`.
    pathname !== "/estado" &&
    !pathname.startsWith("/estado/") &&
    // `/auth/*` son los Route Handlers de intercambio de sesión (OAuth,
    // recuperación de contraseña, activación de cuenta) — corren SIN
    // sesión todavía (justo la están estableciendo), así que tratarlos como
    // ruta de (app) los redirigiría a /login antes de que el handler llegue
    // a ejecutarse. `restablecer-contrasena`/`activar-cuenta` son las
    // páginas a las que esos handlers redirigen: tampoco pueden exigir
    // `hasFullSession` (aal2) porque la sesión que traen viene recién
    // creada por un enlace de correo, no por login + TOTP.
    !pathname.startsWith("/auth/") &&
    !pathname.startsWith("/restablecer-contrasena") &&
    !pathname.startsWith("/activar-cuenta")
  )
}

/**
 * Refresca la sesión de Supabase en cada request (Next 16 `proxy.ts`,
 * runtime nodejs fijo).
 *
 * Ojo con AAL: `getUser()` ya devuelve un usuario válido justo después del
 * paso de contraseña (sesión `aal1`), antes de completar TOTP — como las
 * políticas RLS de este proyecto no comprueban `aal` (ver
 * supabase/migrations/..._rls.sql), tratar "hay sesión" como "puede entrar
 * a (app)" saltaría el 2FA por completo cuando sí aplica.
 *
 * MFA es opcional, decisión del usuario (no obligatorio para todos): la
 * puerta real a `(app)` es `currentLevel === nextLevel` — el patrón que
 * recomienda Supabase para "step-up opcional". Si el usuario nunca enroló
 * un factor verificado, `nextLevel` se queda en `"aal1"` igual que
 * `currentLevel` (no hay a qué subir), así que entra solo con contraseña.
 * Si sí tiene un factor verificado, `nextLevel` es `"aal2"` hasta que
 * complete el challenge en /verificacion — ahí sí se le exige.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let hasFullSession = false
  if (user) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    hasFullSession = aal?.currentLevel === aal?.nextLevel

    // Login federado (Entra ID / SAML): el IdP del tenant ya es la
    // autoridad de identidad fuerte (01.3-01.5) — no le pedimos además
    // nuestro TOTP encima. `currentAuthenticationMethods` trae "oauth" o
    // "sso/saml" cuando la sesión vino de ese camino.
    if (!hasFullSession) {
      const methods = aal?.currentAuthenticationMethods ?? []
      hasFullSession = methods.some((m) => {
        const method = typeof m === "string" ? m : m.method
        return method === "oauth" || method === "sso/saml"
      })
    }

    // El AAL de Supabase solo sube a aal2 verificando un factor real — no
    // hay forma nativa de "recordar dispositivo". Por eso ese concepto es
    // enteramente nuestro: si el token de la cookie coincide con un
    // registro vigente en trusted_devices, tratamos la sesión como
    // completa aquí, aunque el AAL siga en aal1 (RLS no depende de aal,
    // ver supabase/migrations/..._rls.sql — el aislamiento sigue siendo
    // por org_id).
    if (!hasFullSession) {
      const deviceToken = request.cookies.get(TRUSTED_DEVICE_COOKIE)?.value
      if (deviceToken) {
        const tokenHash = createHash("sha256").update(deviceToken).digest("hex")
        const { data: device } = await supabase
          .from("trusted_devices")
          .select("id")
          .eq("profile_id", user.id)
          .eq("token_hash", tokenHash)
          .gt("expira_en", new Date().toISOString())
          .maybeSingle()
        hasFullSession = !!device
      }
    }
  }

  const { pathname } = request.nextUrl

  if (isAppRoute(pathname)) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    if (!hasFullSession) {
      return NextResponse.redirect(new URL("/verificacion", request.url))
    }
    // `ban_duration` (ver features/team/actions/users.ts) bloquea el login,
    // pero no invalida un access token ya emitido — sin esto, una sesión
    // desactivada seguiría entrando a (app) hasta que ese token expire por
    // su cuenta. Consulta indexada por PK, una por request de (app).
    const { data: profile } = await supabase
      .from("profiles")
      .select("estado")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.estado === "inactivo") {
      return NextResponse.redirect(
        new URL("/login?error=cuenta_inactiva", request.url)
      )
    }
    return response
  }

  if (pathname === "/login") {
    if (hasFullSession) {
      return NextResponse.redirect(new URL("/resumen", request.url))
    }
    if (user) {
      return NextResponse.redirect(new URL("/verificacion", request.url))
    }
  }

  if (pathname.startsWith("/verificacion") && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (pathname.startsWith("/sso") && hasFullSession) {
    return NextResponse.redirect(new URL("/resumen", request.url))
  }

  return response
}
