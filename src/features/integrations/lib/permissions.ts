import type { Action, Resource } from "@/lib/permissions"

/** Igual que `features/promotions/lib/permissions.ts` — duplicado a propósito: las features no se importan entre sí (ver CLAUDE.md §2). */
export function hasPermission(
  permissions: Set<string>,
  resource: Resource,
  action: Action
): boolean {
  return permissions.has(`${resource}:${action}`)
}
