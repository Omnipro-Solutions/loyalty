import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { cache } from "react"

import type { Database } from "@/types/database.types"

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. `cookies()` es async desde Next 15 y en Next 16 ya no admite
 * acceso síncrono en absoluto — por eso esta función también es async.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // `setAll` se llamó desde un Server Component sin permiso de
            // escritura de cookies. Es seguro ignorarlo mientras `proxy.ts`
            // (src/lib/supabase/proxy.ts) refresque la sesión en cada
            // request — ver Fase 3.
          }
        },
      },
    }
  )
}

/**
 * `getUser()` siempre revalida el JWT contra el servidor de Auth (a
 * diferencia de `getSession()`) — por diseño, es la forma segura de
 * verificar sesión desde el servidor. Sin `cache()`, cada action-client o
 * query que necesita el usuario autenticado dispara su propio round-trip a
 * `/auth/v1/user`, aunque el mismo request ya lo haya resuelto (visible como
 * GETs duplicados en los logs de Supabase). `cache()` memoiza la promesa por
 * request de React, así que una sola carga de página o una sola Server
 * Action solo paga esa llamada de red una vez, sin importar cuántos sitios
 * la invoquen.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
