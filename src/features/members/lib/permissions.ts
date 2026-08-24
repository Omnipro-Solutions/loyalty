import type { Action, Resource } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"

/** Igual que `features/promotions/lib/permissions.ts` — duplicado a propósito: las features no se importan entre sí (ver CLAUDE.md §2). */
export function hasPermission(
  permissions: Set<string>,
  resource: Resource,
  action: Action
): boolean {
  return permissions.has(`${resource}:${action}`)
}

/** Set de permisos (`recurso:accion`) de un rol — comparte la consulta a `role_permissions` entre `membersPermissionActionClient` y `getMemberProfilePermissions`. */
export async function getPermissionsSet(roleId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("recurso, accion")
    .eq("role_id", roleId)

  return new Set((permissions ?? []).map((p) => `${p.recurso}:${p.accion}`))
}

export type MemberProfilePermissions = {
  permissions: Set<string>
}

/**
 * Mismo patrón que `getProfileWithPermissions`
 * (`features/team/lib/queries.ts`): devuelve el set genérico de permisos
 * del usuario autenticado — cada call site decide con qué `resource`/
 * `action` llamar `hasPermission` (aquí, el gate de "Enviar
 * promoción"/"Aplicar regla" del Hero, para nunca abrir un diálogo solo
 * para mostrar "no tienes permiso"). Duplicado a propósito (CLAUDE.md §2):
 * las features no se importan entre sí.
 */
export async function getMemberProfilePermissions(): Promise<MemberProfilePermissions | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile) return null

  return { permissions: await getPermissionsSet(profile.role_id) }
}
