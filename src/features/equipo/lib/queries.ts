import type { Action, Resource } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

import { getEstadoAuthPorProfileId } from "./admin-auth"

export type RoleRow = Database["public"]["Tables"]["roles"]["Row"]
export type TiendaOption = Pick<
  Database["public"]["Tables"]["tiendas"]["Row"],
  "id" | "nombre"
>

export type Usuario = Database["public"]["Tables"]["profiles"]["Row"] & {
  rol: Pick<RoleRow, "id" | "nombre" | "alcance_tiendas">
  tienda: TiendaOption | null
  ultimoAccesoEn: string | null
  tiene2fa: boolean
}

export type UsuariosFiltros = {
  busqueda?: string
  roleId?: string
  estado?: "activo" | "inactivo"
  page?: number
}

export const EQUIPO_PAGE_SIZE = 7

const USUARIO_CON_ROL_Y_TIENDA =
  "*, rol:roles(id, nombre, alcance_tiendas), tienda:tiendas(id, nombre)"

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizarBusqueda(valor: string): string {
  return valor.replace(/[,()%]/g, "").trim()
}

export async function listUsuarios(
  filtros: UsuariosFiltros = {}
): Promise<{ usuarios: Usuario[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const desde = (page - 1) * EQUIPO_PAGE_SIZE
  const hasta = desde + EQUIPO_PAGE_SIZE - 1

  let query = supabase
    .from("profiles")
    .select(USUARIO_CON_ROL_Y_TIENDA, { count: "exact" })
    .order("creado_en")
    .range(desde, hasta)

  const busqueda = filtros.busqueda ? sanitizarBusqueda(filtros.busqueda) : ""
  if (busqueda) {
    query = query.or(`nombre.ilike.%${busqueda}%,email.ilike.%${busqueda}%`)
  }
  if (filtros.roleId) query = query.eq("role_id", filtros.roleId)
  if (filtros.estado) query = query.eq("estado", filtros.estado)

  const { data, error, count } = await query
  if (error) throw error

  const estadoAuth = await getEstadoAuthPorProfileId(
    (data ?? []).map((p) => p.id)
  )
  const usuarios = (data ?? []).map((p) => ({
    ...p,
    ultimoAccesoEn: estadoAuth.get(p.id)?.ultimoAccesoEn ?? null,
    tiene2fa: estadoAuth.get(p.id)?.tiene2fa ?? false,
  }))

  return { usuarios, total: count ?? 0 }
}

export type EquipoKpis = {
  usuariosActivos: number
  nuevosEsteMes: number
  totalUsuarios: number
  invitacionesPendientes: number
  invitacionesPorVencer: number
  con2fa: number
  sinAccesoHace60Dias: number
}

function inicioDeMes(): string {
  const ahora = new Date()
  return new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
}

function haceMasDeNDias(fechaIso: string | null, dias: number): boolean {
  if (!fechaIso) return true
  const transcurridos = (Date.now() - new Date(fechaIso).getTime()) / 86_400_000
  return transcurridos > dias
}

export async function getEquipoKpis(): Promise<EquipoKpis> {
  const supabase = await createClient()
  const en3Dias = new Date(Date.now() + 3 * 86_400_000).toISOString()

  const [
    { data: perfiles, error },
    { count: invitacionesPendientes, error: errorPendientes },
    { count: invitacionesPorVencer, error: errorPorVencer },
  ] = await Promise.all([
    supabase.from("profiles").select("id, estado, creado_en"),
    supabase
      .from("invitaciones")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),
    supabase
      .from("invitaciones")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente")
      .lte("expira_en", en3Dias),
  ])
  if (error) throw error
  if (errorPendientes) throw errorPendientes
  if (errorPorVencer) throw errorPorVencer

  const filas = perfiles ?? []
  const desdeInicioDeMes = inicioDeMes()
  const estadoAuth = await getEstadoAuthPorProfileId(filas.map((p) => p.id))

  return {
    usuariosActivos: filas.filter((p) => p.estado === "activo").length,
    nuevosEsteMes: filas.filter((p) => p.creado_en >= desdeInicioDeMes).length,
    totalUsuarios: filas.length,
    invitacionesPendientes: invitacionesPendientes ?? 0,
    invitacionesPorVencer: invitacionesPorVencer ?? 0,
    con2fa: [...estadoAuth.values()].filter((v) => v.tiene2fa).length,
    sinAccesoHace60Dias: filas.filter((p) =>
      haceMasDeNDias(estadoAuth.get(p.id)?.ultimoAccesoEn ?? null, 60)
    ).length,
  }
}

export type RoleConConteo = RoleRow & { miembros: number }

export async function listRoles(): Promise<RoleConConteo[]> {
  const supabase = await createClient()
  const [{ data: roles, error }, { data: perfiles, error: errorPerfiles }] =
    await Promise.all([
      supabase.from("roles").select("*").order("creado_en"),
      supabase.from("profiles").select("role_id"),
    ])
  if (error) throw error
  if (errorPerfiles) throw errorPerfiles

  const conteoPorRoleId = new Map<string, number>()
  for (const p of perfiles ?? []) {
    conteoPorRoleId.set(p.role_id, (conteoPorRoleId.get(p.role_id) ?? 0) + 1)
  }

  return (roles ?? []).map((r) => ({
    ...r,
    miembros: conteoPorRoleId.get(r.id) ?? 0,
  }))
}

export type RoleDetalle = RoleRow & {
  permisos: Partial<Record<Resource, Action[]>>
  miembrosPreview: Pick<Usuario, "id" | "nombre">[]
  miembrosTotal: number
}

export async function getRoleDetalle(
  roleId: string
): Promise<RoleDetalle | null> {
  const supabase = await createClient()
  const [
    { data: role, error },
    { data: permisos, error: errorPermisos },
    { data: miembros, error: errorMiembros, count },
  ] = await Promise.all([
    supabase.from("roles").select("*").eq("id", roleId).maybeSingle(),
    supabase
      .from("role_permissions")
      .select("recurso, accion")
      .eq("role_id", roleId),
    supabase
      .from("profiles")
      .select("id, nombre", { count: "exact" })
      .eq("role_id", roleId)
      .order("creado_en")
      .limit(4),
  ])
  if (error) throw error
  if (!role) return null
  if (errorPermisos) throw errorPermisos
  if (errorMiembros) throw errorMiembros

  const permisosPorRecurso: Partial<Record<Resource, Action[]>> = {}
  for (const p of permisos ?? []) {
    const recurso = p.recurso as Resource
    const lista = permisosPorRecurso[recurso] ?? []
    lista.push(p.accion as Action)
    permisosPorRecurso[recurso] = lista
  }

  return {
    ...role,
    permisos: permisosPorRecurso,
    miembrosPreview: miembros ?? [],
    miembrosTotal: count ?? 0,
  }
}

export type Invitacion = Database["public"]["Tables"]["invitaciones"]["Row"] & {
  rol: Pick<RoleRow, "nombre">
  invitadoPor: Pick<Usuario, "nombre"> | null
}

export async function listInvitaciones(): Promise<Invitacion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("invitaciones")
    .select("*, rol:roles(nombre), invitadoPor:profiles(nombre)")
    .order("creado_en", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Invitacion[]
}

export async function listTiendasOptions(): Promise<TiendaOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return data
}

export type PerfilConPermisos = {
  profileId: string
  orgId: string
  roleId: string
  permisos: Set<string>
}

/** Perfil autenticado + su set de permisos reales (`role_permissions`), para decidir qué mostrar/permitir en 09. */
export async function getPerfilConPermisos(): Promise<PerfilConPermisos | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("org_id, role_id")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw error
  if (!perfil) return null

  const { data: permisos, error: errorPermisos } = await supabase
    .from("role_permissions")
    .select("recurso, accion")
    .eq("role_id", perfil.role_id)
  if (errorPermisos) throw errorPermisos

  return {
    profileId: user.id,
    orgId: perfil.org_id,
    roleId: perfil.role_id,
    permisos: new Set((permisos ?? []).map((p) => `${p.recurso}:${p.accion}`)),
  }
}

export function tienePermiso(
  permisos: Set<string>,
  recurso: Resource,
  accion: Action
): boolean {
  return permisos.has(`${recurso}:${accion}`)
}
