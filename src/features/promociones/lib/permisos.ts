import type { Action, Resource } from "@/lib/permissions"

/** Igual que `features/equipo/lib/queries.ts` `tienePermiso` — duplicado a propósito: las features no se importan entre sí (ver CLAUDE.md §2). */
export function tienePermiso(
  permisos: Set<string>,
  recurso: Resource,
  accion: Action
): boolean {
  return permisos.has(`${recurso}:${accion}`)
}
