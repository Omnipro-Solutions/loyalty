import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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
