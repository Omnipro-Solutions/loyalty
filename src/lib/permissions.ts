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
  // Dos módulos que existían como pantalla y no como fila de la matriz —
  // así que sus Server Actions no tenían con qué gatear y cualquier miembro
  // autenticado de la organización podía guardar credenciales de un sistema
  // externo o recalcular los parámetros del programa.
  "integraciones",
  "programa",
  // El saldo canjeable de un socio. Estaba dentro de `clientes`, pero
  // acreditarle o quitarle puntos no es «editar una ficha»: es mover algo
  // equivalente a dinero, y por eso la acción se lo pedía prestado a
  // `reglas:crear` — el permiso de crear reglas de descuento autorizaba
  // mover saldo.
  "puntos",
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
  // Dos verbos que existían como escritura y no como celda, así que cada uno
  // tomaba prestada la casilla más cercana.
  "ajustar",
  "asignar",
] as const
export type Action = (typeof ACTIONS)[number]

/** Header corto de cada columna de acción — "IMPRIMIR"/"EXPORTAR" no caben en `w-24` con `action.toUpperCase()`. */
export const ACTION_LABELS: Record<Action, string> = {
  ver: "VER",
  crear: "CREAR",
  editar: "EDITAR",
  eliminar: "ELIMINAR",
  aprobar: "APROBAR",
  emitir: "EMITIR",
  anular: "ANULAR",
  imprimir: "IMPRIMIR",
  exportar: "EXPORTAR",
  ajustar: "AJUSTAR",
  asignar: "ASIGNAR",
}

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
 * Todo recurso con un export server-side. Antes solo estaban `cupones` y
 * `clientes`, así que los exports de catálogo, promociones, tiendas,
 * audiencias y del lienzo salían SIN gate: el comentario «el gate va aquí»
 * de cada `export.ts` esperaba justo esta celda. `clientes` cubre también
 * las audiencias, que hoy viven bajo ese recurso.
 *
 * `equipo`, `facturacion`, `integraciones` y `programa` quedan fuera: no
 * tienen export.
 */
const EXPORTABLE_RESOURCES: readonly Resource[] = [
  "cupones",
  "clientes",
  "catalogo",
  "promociones",
  "tiendas",
  "journeys",
]

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
  ajustar: ["puntos"],
  // Habilitar una promoción a un socio puntual, saltándose su segmento. Es
  // una excepción individual, no diseño de campaña: el call center la
  // necesita y no necesita crear campañas.
  asignar: ["promociones"],
}

/**
 * Recursos que NO admiten las cuatro acciones universales
 * (`ver/crear/editar/eliminar`). `ACTION_SCOPE` va de acción a recursos y no
 * sabe expresar esto; hasta que el mapa se invierta a recurso→acciones
 * (ver la propuesta de permisos), esta excepción cubre el único caso real:
 * un saldo no se «crea» ni se «elimina», se consulta y se ajusta.
 */
const RESOURCE_ONLY_ACTIONS: Partial<Record<Resource, readonly Action[]>> = {
  puntos: ["ver", "ajustar"],
}

/** If a resource×action combination doesn't apply, the matrix cell is disabled instead of shown unchecked. */
export function actionApplies(resource: Resource, action: Action): boolean {
  const only = RESOURCE_ONLY_ACTIONS[resource]
  if (only) return only.includes(action)
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
    promociones: ["ver", "crear", "editar", "eliminar", "asignar"],
    reglas: ["ver", "crear", "editar"],
    journeys: ["ver", "crear", "editar", "exportar"],
    cupones: ["ver", "crear", "editar", "emitir", "imprimir", "exportar"],
    // Ve qué hay conectado y con qué parámetros corre el programa, pero no
    // toca credenciales ni recalcula saldos: eso es de administración.
    integraciones: ["ver"],
    programa: ["ver"],
    puntos: ["ver", "ajustar"],
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
  // Solo lectura, y ni siquiera de todo: sin `exportar` en ningún recurso
  // (sacar un CSV es extraer datos, no leer un informe) y sin los módulos de
  // Configuración, donde `ver` ya muestra credenciales y parámetros.
  lector: {
    ...(Object.fromEntries(
      OPERATIONAL_RESOURCES.map((r) => [r, ["ver"] as const])
    ) as Matrix["lector"]),
    cupones: ["ver"],
    puntos: ["ver"],
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

export type PermissionCell = { resource: Resource; action: Action }

/**
 * El rol de sistema `admin` es, por definición, "Acceso total a todos los
 * módulos y a la configuración de la organización" (su propia `descripcion`
 * en `create_system_roles_for_org`): su matriz no se edita, se afirma
 * entera. Recortarla es lo que dejó a la org demo sin `promociones:aprobar`
 * y compañía — `updateRoleAction` reemplaza la matriz completa en cada
 * guardado, así que un solo "Nada" sobre este rol la borra.
 *
 * No confundir con publicar directo: eso depende de `rol_base = 'admin'`
 * (ver `canPublishDirectly` y los triggers de la doble aprobación), no de
 * estas filas. Lo que sí se pierde al recortarlo es poder DECIDIR
 * aprobaciones pendientes, y con ello la única salida de una promoción o
 * regla que ya está en `pendiente_aprobacion`.
 */
export function isFullAccessRole(role: {
  tipo: string
  rol_base: string
}): boolean {
  return role.tipo === "sistema" && role.rol_base === "admin"
}

/** Las combinaciones recurso×acción que existen de verdad — el resto es candado. */
export function applicablePermissions(): PermissionCell[] {
  return RESOURCES.flatMap((resource) =>
    ACTIONS.filter((action) => actionApplies(resource, action)).map(
      (action) => ({ resource, action })
    )
  )
}

/** Lo que le faltaría a un rol de acceso total. `[]` = matriz completa. */
export function missingForFullAccess(
  granted: readonly PermissionCell[]
): PermissionCell[] {
  const set = new Set(granted.map((p) => `${p.resource}:${p.action}`))
  return applicablePermissions().filter(
    (p) => !set.has(`${p.resource}:${p.action}`)
  )
}
