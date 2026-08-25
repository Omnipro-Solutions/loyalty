import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"

/**
 * Igual que `teamActionClient`: los parámetros del programa son
 * configuración de organización, así que se protegen con el mismo permiso
 * que el resto de Ajustes (`equipo:editar`) en vez de crear un recurso
 * nuevo en `role_permissions` solo para esta pantalla.
 */
export const settingsActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role_id")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("recurso, accion")
    .eq("role_id", profile.role_id)

  const permissionsSet = new Set(
    (permissions ?? []).map((p) => `${p.recurso}:${p.accion}`)
  )
  if (!permissionsSet.has("equipo:editar")) {
    throw new Error("No tienes permiso para editar los ajustes del programa.")
  }

  return next({ ctx: { supabase, userId: user.id, orgId: profile.org_id } })
})
