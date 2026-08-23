import type { Rol } from "@/types/domain"

/**
 * Conjunto cerrado de módulos y acciones de "09.2 · Equipo · roles y
 * permisos". La fuente de verdad para qué puede hacer una persona es la
 * fila real de `role_permissions` (por `role_id`, editable desde esa
 * pantalla) — ver `features/equipo/lib/queries.ts`. Esta matriz pura solo
 * sirve como PLANTILLA por defecto al crear un rol desde un archetype
 * (`rol_base`, "Nuevo rol") y como respaldo síncrono cuando todavía no se
 * cargó el rol real (ninguna decisión de escritura debe apoyarse solo en
 * esto). Debe mantenerse razonablemente equivalente a
 * `create_system_roles_for_org()` en
 * `supabase/migrations/20260823100000_equipo_roles_permisos.sql`, que es
 * quien de verdad siembra los 3 roles de sistema.
 */
export const RECURSOS = [
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
export type Recurso = (typeof RECURSOS)[number]

export const ACCIONES = [
  "ver",
  "crear",
  "editar",
  "eliminar",
  "aprobar",
] as const
export type Accion = (typeof ACCIONES)[number]

/**
 * "Aprobar" ("habilita publicar cambios que afectan a clientes", copy de
 * 09.2) solo existe sobre módulos operativos de cara al cliente — no tiene
 * sentido "aprobar" un dashboard, la gestión del equipo o la facturación.
 * La UI de la matriz bloquea esa celda (candado) para el resto.
 */
export const RECURSOS_APROBABLES: readonly Recurso[] = [
  "catalogo",
  "tiendas",
  "clientes",
  "promociones",
  "reglas",
  "journeys",
]

const RECURSOS_OPERATIVOS: readonly Recurso[] = [
  "resumen",
  "catalogo",
  "tiendas",
  "clientes",
  "promociones",
  "reglas",
  "journeys",
]

/** Si una combinación recurso×acción no aplica, la celda de la matriz se deshabilita en vez de mostrarse desmarcada. */
export function accionAplica(recurso: Recurso, accion: Accion): boolean {
  return accion !== "aprobar" || RECURSOS_APROBABLES.includes(recurso)
}

type Matriz = Record<Rol, Partial<Record<Recurso, readonly Accion[]>>>

const MATRIZ: Matriz = {
  admin: Object.fromEntries(
    RECURSOS.map((r) => [r, ACCIONES])
  ) as Matriz["admin"],
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
      RECURSOS_OPERATIVOS.map((r) => [r, ["ver"] as const])
    ),
    promociones: ["ver", "aprobar"],
    reglas: ["ver", "aprobar"],
    journeys: ["ver", "aprobar"],
  },
  lector: Object.fromEntries(
    RECURSOS_OPERATIVOS.map((r) => [r, ["ver"] as const])
  ) as Matriz["lector"],
}

/**
 * Plantilla pura por archetype: sin red, sin base de datos. Úsala para
 * prellenar la matriz al crear un rol nuevo o como respaldo de UI antes de
 * que cargue el rol real — nunca como autorización de escritura, que vive
 * en `role_permissions` (real, editable por organización).
 */
export function can(rolBase: Rol, accion: Accion, recurso: Recurso): boolean {
  return MATRIZ[rolBase]?.[recurso]?.includes(accion) ?? false
}
