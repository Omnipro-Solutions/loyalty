import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

/**
 * Extiende el cliente base de next-safe-action con contexto de sesión —
 * las acciones de `features/stores` corren detrás de `proxy.ts` (sesión
 * completa). Resuelve `org_id` una sola vez aquí en vez de repetirlo en
 * cada acción.
 */
export const storesActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  return next({ ctx: { supabase, userId: user.id, orgId: profile.org_id } })
})
