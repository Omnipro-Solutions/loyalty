import type { Action, Resource } from "@/lib/permissions"

/** Igual que `features/team/lib/queries.ts` `hasPermission` — duplicado a propósito: las features no se importan entre sí (ver CLAUDE.md §2). */
export function hasPermission(
  permissions: Set<string>,
  resource: Resource,
  action: Action
): boolean {
  return permissions.has(`${resource}:${action}`)
}
