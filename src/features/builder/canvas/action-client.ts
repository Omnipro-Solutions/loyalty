import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Extiende el cliente base de next-safe-action (`src/lib/safe-action.ts`)
 * con contexto de sesión — a diferencia de las acciones de `(auth)`, las de
 * `features/builder` sí corren después de tener sesión completa (la ruta
 * `journeys` está protegida por `proxy.ts`). Resuelve `org_id` una sola vez
 * aquí en vez de repetirlo en cada acción.
 */
export const builderActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  return next({ ctx: { supabase, userId: user.id, orgId: profile.org_id } })
})
