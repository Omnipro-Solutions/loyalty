import type { Action, Resource } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database.types"

import { getAuthStatusByProfileId } from "./admin-auth"

export type RoleRow = Database["public"]["Tables"]["roles"]["Row"]
export type StoreOption = Pick<
  Database["public"]["Tables"]["tiendas"]["Row"],
  "id" | "nombre"
>

export type User = Database["public"]["Tables"]["profiles"]["Row"] & {
  role: Pick<RoleRow, "id" | "nombre" | "alcance_tiendas">
  store: StoreOption | null
  lastAccessAt: string | null
  has2fa: boolean
}

export type UserFilters = {
  search?: string
  roleId?: string
  status?: "activo" | "inactivo"
  page?: number
  pageSize?: number
}

export const TEAM_PAGE_SIZE = 7

const USER_WITH_ROLE_AND_STORE =
  "*, role:roles(id, nombre, alcance_tiendas), store:tiendas(id, nombre)"

/** PostgREST interpreta `,()%` dentro de un filtro `.or()` — se descartan del texto de búsqueda. */
function sanitizeSearch(value: string): string {
  return value.replace(/[,()%]/g, "").trim()
}

export async function listUsers(
  filters: UserFilters = {}
): Promise<{ users: User[]; total: number }> {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? TEAM_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from("profiles")
    .select(USER_WITH_ROLE_AND_STORE, { count: "exact" })
    .order("creado_en")
    .range(from, to)

  const search = filters.search ? sanitizeSearch(filters.search) : ""
  if (search) {
    query = query.or(`nombre.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (filters.roleId) query = query.eq("role_id", filters.roleId)
  if (filters.status) query = query.eq("estado", filters.status)

  const { data, error, count } = await query
  if (error) throw error

  const authStatus = await getAuthStatusByProfileId(
    (data ?? []).map((p) => p.id)
  )
  const users = (data ?? []).map((p) => ({
    ...p,
    lastAccessAt: authStatus.get(p.id)?.lastAccessAt ?? null,
    has2fa: authStatus.get(p.id)?.has2fa ?? false,
  }))

  return { users, total: count ?? 0 }
}

export type TeamKpis = {
  activeUsers: number
  newThisMonth: number
  totalUsers: number
  pendingInvitations: number
  expiringInvitations: number
  with2fa: number
  noAccess60Days: number
}

function startOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function moreThanNDaysAgo(dateIso: string | null, days: number): boolean {
  if (!dateIso) return true
  const elapsed = (Date.now() - new Date(dateIso).getTime()) / 86_400_000
  return elapsed > days
}

export async function getTeamKpis(): Promise<TeamKpis> {
  const supabase = await createClient()
  const in3Days = new Date(Date.now() + 3 * 86_400_000).toISOString()

  const [
    { data: profiles, error },
    { count: pendingInvitations, error: pendingError },
    { count: expiringInvitations, error: expiringError },
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
      .lte("expira_en", in3Days),
  ])
  if (error) throw error
  if (pendingError) throw pendingError
  if (expiringError) throw expiringError

  const rows = profiles ?? []
  const sinceStartOfMonth = startOfMonth()
  const authStatus = await getAuthStatusByProfileId(rows.map((p) => p.id))

  return {
    activeUsers: rows.filter((p) => p.estado === "activo").length,
    newThisMonth: rows.filter((p) => p.creado_en >= sinceStartOfMonth).length,
    totalUsers: rows.length,
    pendingInvitations: pendingInvitations ?? 0,
    expiringInvitations: expiringInvitations ?? 0,
    with2fa: [...authStatus.values()].filter((v) => v.has2fa).length,
    noAccess60Days: rows.filter((p) =>
      moreThanNDaysAgo(authStatus.get(p.id)?.lastAccessAt ?? null, 60)
    ).length,
  }
}

export type RoleWithCount = RoleRow & { members: number }

export async function listRoles(): Promise<RoleWithCount[]> {
  const supabase = await createClient()
  const [{ data: roles, error }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from("roles").select("*").order("creado_en"),
      supabase.from("profiles").select("role_id"),
    ])
  if (error) throw error
  if (profilesError) throw profilesError

  const countByRoleId = new Map<string, number>()
  for (const p of profiles ?? []) {
    countByRoleId.set(p.role_id, (countByRoleId.get(p.role_id) ?? 0) + 1)
  }

  return (roles ?? []).map((r) => ({
    ...r,
    members: countByRoleId.get(r.id) ?? 0,
  }))
}

export type RoleDetail = RoleRow & {
  permissions: Partial<Record<Resource, Action[]>>
  membersPreview: Pick<User, "id" | "nombre">[]
  membersTotal: number
}

export async function getRoleDetail(
  roleId: string
): Promise<RoleDetail | null> {
  const supabase = await createClient()
  const [
    { data: role, error },
    { data: permissions, error: permissionsError },
    { data: members, error: membersError, count },
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
  if (permissionsError) throw permissionsError
  if (membersError) throw membersError

  const permissionsByResource: Partial<Record<Resource, Action[]>> = {}
  for (const p of permissions ?? []) {
    const resource = p.recurso as Resource
    const list = permissionsByResource[resource] ?? []
    list.push(p.accion as Action)
    permissionsByResource[resource] = list
  }

  return {
    ...role,
    permissions: permissionsByResource,
    membersPreview: members ?? [],
    membersTotal: count ?? 0,
  }
}

export type Invitation = Database["public"]["Tables"]["invitaciones"]["Row"] & {
  role: Pick<RoleRow, "nombre">
  invitedBy: Pick<User, "nombre"> | null
}

export async function listInvitations(): Promise<Invitation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("invitaciones")
    .select("*, role:roles(nombre), invitedBy:profiles(nombre)")
    .order("creado_en", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Invitation[]
}

export async function listStoreOptions(): Promise<StoreOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tiendas")
    .select("id, nombre")
    .order("nombre")
  if (error) throw error
  return data
}

export type ProfileWithPermissions = {
  profileId: string
  orgId: string
  roleId: string
  permissions: Set<string>
}

/** Perfil autenticado + su set de permisos reales (`role_permissions`), para decidir qué mostrar/permitir en 09. */
export async function getProfileWithPermissions(): Promise<ProfileWithPermissions | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("org_id, role_id")
    .eq("id", user.id)
    .maybeSingle()
  if (error) throw error
  if (!profile) return null

  const { data: permissions, error: permissionsError } = await supabase
    .from("role_permissions")
    .select("recurso, accion")
    .eq("role_id", profile.role_id)
  if (permissionsError) throw permissionsError

  return {
    profileId: user.id,
    orgId: profile.org_id,
    roleId: profile.role_id,
    permissions: new Set(
      (permissions ?? []).map((p) => `${p.recurso}:${p.accion}`)
    ),
  }
}

export function hasPermission(
  permissions: Set<string>,
  resource: Resource,
  action: Action
): boolean {
  return permissions.has(`${resource}:${action}`)
}
