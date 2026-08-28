import { notFound } from "next/navigation"

import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { UserAccessCard } from "@/features/team/components/user-access-card"
import { UserDetailHero } from "@/features/team/components/user-detail-hero"
import {
  USER_DETAIL_TABS,
  UserDetailTabsNav,
  type UserDetailTab,
} from "@/features/team/components/user-detail-tabs-nav"
import { UserDevicesCard } from "@/features/team/components/user-devices-card"
import { UserSecurityCard } from "@/features/team/components/user-security-card"
import {
  getUserAuthDetail,
  listUserTrustedDevices,
} from "@/features/team/lib/admin-auth"
import {
  getProfileWithPermissions,
  getUserById,
  hasPermission,
  listRoles,
  listStoreOptions,
  type User,
} from "@/features/team/lib/queries"
import { getAuthenticatedUser } from "@/lib/supabase/server"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

async function AccessTabContent({
  user,
  canManage,
  isSelf,
}: {
  user: User
  canManage: boolean
  isSelf: boolean
}) {
  const [roles, stores] = await Promise.all([listRoles(), listStoreOptions()])
  return (
    <UserAccessCard
      user={user}
      roles={roles}
      stores={stores}
      canManage={canManage}
      isSelf={isSelf}
    />
  )
}

async function SecurityTabContent({
  profileId,
  canManage,
}: {
  profileId: string
  canManage: boolean
}) {
  const authDetail = await getUserAuthDetail(profileId)
  return (
    <UserSecurityCard
      profileId={profileId}
      authDetail={authDetail}
      canManage={canManage}
    />
  )
}

async function DevicesTabContent({
  profileId,
  canManage,
}: {
  profileId: string
  canManage: boolean
}) {
  const devices = await listUserTrustedDevices(profileId)
  return (
    <UserDevicesCard
      profileId={profileId}
      devices={devices}
      canManage={canManage}
    />
  )
}

/** Figma no cubre esta pantalla — compuesta con el mismo patrón de detalle-con-tabs de `cupones/[id]`, reutilizando la composición visual de "Mi perfil" en modo administración (ver plan `deep-napping-valley`). */
export default async function UserDetailPage({
  params,
  searchParams,
}: PageProps<"/ajustes/equipo/usuarios/[id]">) {
  const { id } = await params
  const sp = await searchParams
  const tab = (firstValue(sp.tab) ?? USER_DETAIL_TABS[0].value) as UserDetailTab

  const [user, profile, currentUser] = await Promise.all([
    getUserById(id),
    getProfileWithPermissions(),
    getAuthenticatedUser(),
  ])
  if (!user) notFound()

  const canManage = profile
    ? hasPermission(profile.permissions, "equipo", "editar")
    : false
  const isSelf = currentUser?.id === user.id

  return (
    <AppPage
      breadcrumb={`Configuración  ›  Equipo y permisos  ›  ${user.nombre}`}
      title={user.nombre}
    >
      <BackLink href="/ajustes/equipo">Volver a Equipo y permisos</BackLink>

      <UserDetailHero user={user} canManage={canManage} isSelf={isSelf} />

      <div className="flex flex-col gap-4 rounded-2xl bg-background p-5 shadow-form-section">
        <UserDetailTabsNav active={tab} userId={id} />

        {tab === "acceso" && (
          <AccessTabContent user={user} canManage={canManage} isSelf={isSelf} />
        )}
        {tab === "seguridad" && (
          <SecurityTabContent profileId={id} canManage={canManage} />
        )}
        {tab === "dispositivos" && (
          <DevicesTabContent profileId={id} canManage={canManage} />
        )}
      </div>
    </AppPage>
  )
}
