import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

import { hasPermission } from "../lib/queries"

/**
 * Extiende el cliente base de next-safe-action: además de resolver
 * `org_id` (como `storesActionClient`), exige que el rol real de quien
 * llama tenga `equipo:editar` — crear/duplicar/editar roles e invitar
 * gente es justo lo que esa matriz protege, así que la puerta de entrada
 * de las Server Actions es el lugar natural para comprobarlo (RLS solo
 * aísla por organización, no decide esto — ver CLAUDE.md §5.2).
 */
export const teamActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role_id, role:roles(role_permissions(recurso, accion))")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  const permissionsSet = new Set(
    (profile.role?.role_permissions ?? []).map(
      (p) => `${p.recurso}:${p.accion}`
    )
  )
  if (!hasPermission(permissionsSet, "equipo", "editar")) {
    throw new Error("No tienes permiso para gestionar el equipo.")
  }

  return next({
    ctx: {
      supabase,
      userId: user.id,
      orgId: profile.org_id,
      roleId: profile.role_id,
    },
  })
})
