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

export type MemberActionPermissions = {
  canAssignPromotion: boolean
  canApplyPointsRule: boolean
}

/**
 * Gate de visibilidad para "Enviar promoción"/"Aplicar regla" del Hero —
 * nunca se abre un diálogo solo para mostrar "no tienes permiso" (mismo
 * criterio que el resto del repo). Duplica la resolución de
 * `role_permissions` de `getProfileWithPermissions`
 * (`features/team/lib/queries.ts`) porque las features no se importan
 * entre sí.
 */
export async function getMemberActionPermissions(): Promise<MemberActionPermissions> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { canAssignPromotion: false, canApplyPointsRule: false }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile) {
    return { canAssignPromotion: false, canApplyPointsRule: false }
  }

  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("recurso, accion")
    .eq("role_id", profile.role_id)

  const permissionsSet = new Set(
    (permissions ?? []).map((p) => `${p.recurso}:${p.accion}`)
  )

  return {
    canAssignPromotion: hasPermission(permissionsSet, "promociones", "crear"),
    canApplyPointsRule: hasPermission(permissionsSet, "reglas", "crear"),
  }
}
