import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database.types"

/**
 * Cliente con `SUPABASE_SERVICE_ROLE_KEY` — solo para código de servidor
 * que necesita la API admin de Auth (ej. `auth.admin.listUsers()` /
 * `auth.admin.mfa.listFactors()` para el 2FA y último acceso de OTRAS
 * personas en 09.1, algo que la sesión propia del usuario no puede leer).
 * Nunca lo importes desde un Client Component: la service role key nunca
 * llega al navegador (sin prefijo `NEXT_PUBLIC_`, ver CLAUDE.md §5.2).
 * Sin cookies ni persistencia de sesión — no representa a ningún usuario.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
