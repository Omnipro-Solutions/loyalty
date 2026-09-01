import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

/**
 * Igual que `teamActionClient`, pero con su propio recurso: antes esta
 * pantalla tomaba prestado `equipo:editar` «en vez de crear un recurso nuevo
 * solo para ella», lo que ataba recalcular los parámetros del programa
 * —niveles, caducidad de puntos, equivalencias— a poder gestionar el equipo.
 * Son dos cosas distintas y ahora `programa` existe en `RESOURCES`.
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
  if (!permissionsSet.has("programa:editar")) {
    throw new Error("No tienes permiso para editar los ajustes del programa.")
  }

  return next({ ctx: { supabase, userId: user.id, orgId: profile.org_id } })
})
