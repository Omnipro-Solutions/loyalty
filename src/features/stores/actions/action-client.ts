import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Extiende el cliente base de next-safe-action con contexto de sesión —
 * las acciones de `features/stores` corren detrás de `proxy.ts` (sesión
 * completa). Resuelve `org_id` una sola vez aquí en vez de repetirlo en
 * cada acción.
 */
export const storesActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role:roles(role_permissions(recurso, accion))")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  // Sin gate en el middleware: crear una tienda y exportar el listado piden
  // permisos distintos, así que cada action decide con cuál llamar
  // `hasPermission` (mismo criterio que `promotionsActionClient`).
  const permissionsSet = new Set(
    (profile.role?.role_permissions ?? []).map(
      (p) => `${p.recurso}:${p.accion}`
    )
  )

  return next({
    ctx: { supabase, userId: user.id, orgId: profile.org_id, permissionsSet },
  })
})
