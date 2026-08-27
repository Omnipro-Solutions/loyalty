import { actionClient } from "@/lib/safe-action"
import { createClient, getAuthenticatedUser } from "@/lib/supabase/server"

import { getPermissionsSet } from "../lib/permissions"

/**
 * Mismo patrón que `storesActionClient`: resuelve `org_id` (y `role_id`,
 * para las acciones que necesitan comprobar un permiso) una sola vez para
 * las Server Actions de `features/members`.
 */
export const membersActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) throw new Error("No autenticado.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role_id")
    .eq("id", user.id)
    .single()
  if (!profile) throw new Error("Perfil no encontrado.")

  return next({
    ctx: {
      supabase,
      userId: user.id,
      orgId: profile.org_id,
      roleId: profile.role_id,
    },
  })
})

/**
 * Extiende `membersActionClient` con `permissionsSet` (igual que
 * `promotionsActionClient`) — solo para las acciones nuevas de "Enviar
 * promoción"/"Aplicar regla". `createMemberAction`/`updateMemberAction`
 * no comprueban permisos y se quedan en `membersActionClient`, sin pagar
 * esta consulta extra a `role_permissions`.
 */
export const membersPermissionActionClient = membersActionClient.use(
  async ({ ctx, next }) => {
    const permissionsSet = await getPermissionsSet(ctx.roleId)
    return next({ ctx: { permissionsSet } })
  }
)
