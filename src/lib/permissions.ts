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
  "cupones",
] as const
export type Resource = (typeof RESOURCES)[number]

export const ACTIONS = [
  "ver",
  "crear",
  "editar",
  "eliminar",
  "aprobar",
  "emitir",
  "anular",
  "imprimir",
  "exportar",
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
  "cupones",
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

const COUPON_ONLY_RESOURCES: readonly Resource[] = ["cupones"]

/**
 * `exportar` no es exclusiva de cupones: `clientes` saca a un CSV el mismo
 * tipo de dato sensible (email, teléfono, documento) que ya justificaba
 * negar `cupones:exportar` a Analista/lector (ver la migración de permisos
 * de cupones) — mismo criterio, mismo candado. El resto de recursos queda
 * fuera hasta que tengan su propio export server-side con gate.
 */
const EXPORTABLE_RESOURCES: readonly Resource[] = ["cupones", "clientes"]

/**
 * A qué recursos aplica cada acción. Una acción ausente del mapa aplica a
 * todos los recursos (caso de `ver/crear/editar/eliminar`). `emitir`,
 * `anular` e `imprimir` son propias del módulo de cupones — en el resto de
 * recursos la celda queda bloqueada con candado, igual que `aprobar` ya
 * hacía fuera de `APPROVABLE_RESOURCES`.
 */
const ACTION_SCOPE: Partial<Record<Action, readonly Resource[]>> = {
  aprobar: APPROVABLE_RESOURCES,
  emitir: COUPON_ONLY_RESOURCES,
  anular: COUPON_ONLY_RESOURCES,
  imprimir: COUPON_ONLY_RESOURCES,
  exportar: EXPORTABLE_RESOURCES,
}

/** If a resource×action combination doesn't apply, the matrix cell is disabled instead of shown unchecked. */
export function actionApplies(resource: Resource, action: Action): boolean {
  const scope = ACTION_SCOPE[action]
  return !scope || scope.includes(resource)
}

type Matrix = Record<Role, Partial<Record<Resource, readonly Action[]>>>

const MATRIX: Matrix = {
  // Filtrado por `actionApplies`: sin esto, "admin" afirmaría combinaciones
  // que no existen en la matriz real (ej. `facturacion:emitir`).
  admin: Object.fromEntries(
    RESOURCES.map((r) => [r, ACTIONS.filter((a) => actionApplies(r, a))])
  ) as Matrix["admin"],
  gestor: {
    resumen: ["ver"],
    catalogo: ["ver", "crear", "editar"],
    tiendas: ["ver", "editar"],
    clientes: ["ver", "crear", "editar", "exportar"],
    // Sin "aprobar" en ninguno de los tres: el gestor es quien solicita la
    // publicación, no quien la aprueba — dárselo recrearía el agujero que
    // cierra la doble aprobación (mismo criterio que ya aplicaba a
    // "cupones", ver `20260831090000_promociones_journeys_doble_aprobacion.sql`).
    promociones: ["ver", "crear", "editar", "eliminar"],
    reglas: ["ver", "crear", "editar"],
    journeys: ["ver", "crear", "editar"],
    cupones: ["ver", "crear", "editar", "emitir", "imprimir", "exportar"],
  },
  aprobador: {
    ...Object.fromEntries(
      OPERATIONAL_RESOURCES.map((r) => [r, ["ver"] as const])
    ),
    promociones: ["ver", "aprobar"],
    reglas: ["ver", "aprobar"],
    journeys: ["ver", "aprobar"],
    cupones: ["ver", "aprobar"],
  },
  lector: {
    ...(Object.fromEntries(
      OPERATIONAL_RESOURCES.map((r) => [r, ["ver"] as const])
    ) as Matrix["lector"]),
    cupones: ["ver"],
  },
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
