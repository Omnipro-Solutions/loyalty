import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Igual que `teamActionClient`: los parámetros del programa son
 * configuración de organización, así que se protegen con el mismo permiso
 * que el resto de Ajustes (`equipo:editar`) en vez de crear un recurso
 * nuevo en `role_permissions` solo para esta pantalla.
 */
export const settingsActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role:roles(role_permissions(recurso, accion))")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  const permissionsSet = new Set(
    (profile.role?.role_permissions ?? []).map(
      (p) => `${p.recurso}:${p.accion}`
    )
  )
  if (!permissionsSet.has("equipo:editar")) {
    throw new Error("No tienes permiso para editar los ajustes del programa.")
  }

  return next({ ctx: { supabase, userId: user.id, orgId: profile.org_id } })
})
