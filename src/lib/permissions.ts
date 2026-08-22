import type { Rol } from "@/types/domain"

/**
 * Matriz rol → permiso. Debe mantenerse equivalente a la tabla
 * `role_permissions` (sembrada en supabase/seed.sql) — esa tabla es la
 * fuente de verdad para la UI de 09.2; esta es la fuente de verdad para la
 * autorización real en código, porque es pura y corre igual en cliente y
 * servidor sin ida y vuelta a la base de datos.
 *
 * A diferencia de `rol` (domain.ts, respaldado por un `check` en SQL),
 * `recurso`/`accion` son `text` libre en la tabla — el conjunto cerrado de
 * abajo es una convención de aplicación, no una restricción de base de datos.
 */
export const RECURSOS = [
  "catalogo",
  "tiendas",
  "clientes",
  "promociones",
  "reglas",
  "journeys",
  "audiencias",
  "equipo",
  "integraciones",
] as const
export type Recurso = (typeof RECURSOS)[number]

export const ACCIONES = [
  "ver",
  "crear",
  "editar",
  "eliminar",
  "publicar",
] as const
export type Accion = (typeof ACCIONES)[number]

const TODOS_LOS_RECURSOS = RECURSOS
const RECURSOS_OPERATIVOS: readonly Recurso[] = [
  "catalogo",
  "tiendas",
  "clientes",
  "promociones",
  "reglas",
  "journeys",
  "audiencias",
]

type Matriz = Record<Rol, Partial<Record<Recurso, readonly Accion[]>>>

const MATRIZ: Matriz = {
  admin: Object.fromEntries(
    TODOS_LOS_RECURSOS.map((r) => [r, ACCIONES])
  ) as Matriz["admin"],
  gestor: {
    ...Object.fromEntries(
      RECURSOS_OPERATIVOS.map((r) => [r, ["ver", "crear", "editar"] as const])
    ),
    promociones: ["ver", "crear", "editar", "publicar"],
    journeys: ["ver", "crear", "editar", "publicar"],
  },
  aprobador: {
    ...Object.fromEntries(TODOS_LOS_RECURSOS.map((r) => [r, ["ver"] as const])),
    promociones: ["ver", "publicar"],
    journeys: ["ver", "publicar"],
  },
  lector: Object.fromEntries(
    RECURSOS_OPERATIVOS.map((r) => [r, ["ver"] as const])
  ) as Matriz["lector"],
}

/**
 * Autorización pura: sin red, sin base de datos. Segura de llamar tanto en
 * un Server Component/Server Action como en un Client Component para
 * decisiones puramente de UI (mostrar/ocultar un botón) — la autoridad real
 * en escritura sigue siendo RLS en Postgres (aislamiento por organización).
 */
export function can(rol: Rol, accion: Accion, recurso: Recurso): boolean {
  return MATRIZ[rol]?.[recurso]?.includes(accion) ?? false
}
