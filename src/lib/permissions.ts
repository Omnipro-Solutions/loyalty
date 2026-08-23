import type { Role } from "@/types/domain"

/**
 * Closed set of modules and actions from "09.2 · Equipo · roles y permisos".
 * The source of truth for what a person can do is the real
 * `role_permissions` row (by `role_id`, editable from that screen) — see
 * `features/team/lib/queries.ts`. This pure matrix only serves as a default
 * TEMPLATE when creating a role from an archetype (`rol_base`, "Nuevo rol")
 * and as a synchronous fallback before the real role has loaded (no write
 * decision should ever rely on this alone). It must stay reasonably
 * equivalent to `create_system_roles_for_org()` in
 * `supabase/migrations/20260823100000_equipo_roles_permisos.sql`, which is
 * what actually seeds the 3 system roles.
 */
export const RESOURCES = [
  "resumen",
  "catalogo",
  "tiendas",
  "clientes",
  "promociones",
  "reglas",
  "journeys",
  "equipo",
  "facturacion",
] as const
export type Resource = (typeof RESOURCES)[number]

export const ACTIONS = [
  "ver",
  "crear",
  "editar",
  "eliminar",
  "aprobar",
] as const
export type Action = (typeof ACTIONS)[number]

/**
 * "Aprobar" ("enables publishing changes that affect customers", 09.2 copy)
 * only exists on customer-facing operational modules — approving a
 * dashboard, team management, or billing makes no sense. The matrix UI locks
 * that cell (padlock) for the rest.
 */
export const APPROVABLE_RESOURCES: readonly Resource[] = [
  "catalogo",
  "tiendas",
  "clientes",
  "promociones",
  "reglas",
  "journeys",
]

const OPERATIONAL_RESOURCES: readonly Resource[] = [
  "resumen",
  "catalogo",
  "tiendas",
  "clientes",
  "promociones",
  "reglas",
  "journeys",
]

/** If a resource×action combination doesn't apply, the matrix cell is disabled instead of shown unchecked. */
export function actionApplies(resource: Resource, action: Action): boolean {
  return action !== "aprobar" || APPROVABLE_RESOURCES.includes(resource)
}

type Matrix = Record<Role, Partial<Record<Resource, readonly Action[]>>>

const MATRIX: Matrix = {
  admin: Object.fromEntries(
    RESOURCES.map((r) => [r, ACTIONS])
  ) as Matrix["admin"],
  gestor: {
    resumen: ["ver"],
    catalogo: ["ver", "crear", "editar"],
    tiendas: ["ver", "editar"],
    clientes: ["ver", "crear", "editar"],
    promociones: ["ver", "crear", "editar", "eliminar", "aprobar"],
    reglas: ["ver", "crear", "editar", "aprobar"],
    journeys: ["ver", "crear", "editar", "aprobar"],
  },
  aprobador: {
    ...Object.fromEntries(
      OPERATIONAL_RESOURCES.map((r) => [r, ["ver"] as const])
    ),
    promociones: ["ver", "aprobar"],
    reglas: ["ver", "aprobar"],
    journeys: ["ver", "aprobar"],
  },
  lector: Object.fromEntries(
    OPERATIONAL_RESOURCES.map((r) => [r, ["ver"] as const])
  ) as Matrix["lector"],
}

/**
 * Pure archetype template: no network, no database. Use it to prefill the
 * matrix when creating a new role or as a UI fallback before the real role
 * loads — never as write authorization, which lives in `role_permissions`
 * (real, editable per organization).
 */
export function can(
  baseRole: Role,
  action: Action,
  resource: Resource
): boolean {
  return MATRIX[baseRole]?.[resource]?.includes(action) ?? false
}
