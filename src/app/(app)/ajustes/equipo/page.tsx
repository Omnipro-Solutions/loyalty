import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { RoutePlaceholder } from "@/components/layout/route-placeholder"
import {
  TeamTabsNav,
  type TeamTab,
} from "@/features/team/components/team-tabs-nav"
import { InvitationsTable } from "@/features/team/components/invitations-table"
import { RoleDetailPanel } from "@/features/team/components/role-detail-panel"
import { RolesList } from "@/features/team/components/roles-list"
import { UsersCard } from "@/features/team/components/users-card"
import {
  getTeamKpis,
  getProfileWithPermissions,
  getRoleDetail,
  listInvitations,
  listRoles,
  listStoreOptions,
  listUsers,
  hasPermission,
} from "@/features/team/lib/queries"
import { formatNumber } from "@/lib/format"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Figma "09 · Equipo y permisos" (725:3563). El sidebar principal de estas
 * pantallas resalta "Ajustes" — no es un ítem de nav propio, es una
 * sub-vista de Ajustes, agrupada junto a Integraciones bajo el ítem
 * colapsable "Ajustes" del sidebar (ver `config/navigation.ts`).
 */
export default async function EquipoPage({
  searchParams,
}: PageProps<"/ajustes/equipo">) {
  const params = await searchParams
  const tab = (firstValue(params.tab) ?? "usuarios") as TeamTab

  const profile = await getProfileWithPermissions()
  const canManage = profile
    ? hasPermission(profile.permissions, "equipo", "editar")
    : false

  return (
    <AppPage
      breadcrumb="Configuración  ›  Equipo y permisos"
      title="Equipo y permisos"
    >
      <TeamTabsNav active={tab} />

      {tab === "usuarios" && (
        <UsersTabContent params={params} canManage={canManage} />
      )}
      {tab === "roles" && (
        <RolesTabContent
          roleId={firstValue(params.rol)}
          canManage={canManage}
        />
      )}
      {tab === "invitaciones" && (
        <InvitationsTabContent canManage={canManage} />
      )}
      {tab === "auditoria" && <RoutePlaceholder phase="Fase 5" />}
    </AppPage>
  )
}

type SearchParams = Awaited<PageProps<"/ajustes/equipo">["searchParams"]>

async function UsersTabContent({
  params,
  canManage,
}: {
  params: SearchParams
  canManage: boolean
}) {
  const search = firstValue(params.q)
  const roleId = firstValue(params.rolFiltro)
  const status = firstValue(params.estado) as "activo" | "inactivo" | undefined
  const page = Number(firstValue(params.page) ?? "1")

  const [{ users, total }, kpis, roles, stores] = await Promise.all([
    listUsers({ search, roleId, status, page }),
    getTeamKpis(),
    listRoles(),
    listStoreOptions(),
  ])

  return (
    <>
      <div className="flex items-start gap-4">
        <KpiCard
          label="Usuarios activos"
          value={formatNumber(kpis.activeUsers)}
          detail={`+${formatNumber(kpis.newThisMonth)} este mes`}
        />
        <KpiCard
          label="Invitaciones pendientes"
          value={formatNumber(kpis.pendingInvitations)}
          detail={
            kpis.expiringInvitations > 0
              ? `${formatNumber(kpis.expiringInvitations)} vencen en 3 días`
              : "ninguna vence pronto"
          }
        />
        <KpiCard
          label="Con 2FA activo"
          value={`${formatNumber(kpis.with2fa)} de ${formatNumber(kpis.totalUsers)}`}
          detail={
            kpis.totalUsers
              ? `${Math.round((kpis.with2fa / kpis.totalUsers) * 100)}% de cobertura`
              : "sin usuarios todavía"
          }
        />
        <KpiCard
          label="Sin acceso hace 60 días"
          value={formatNumber(kpis.noAccess60Days)}
          detail="revisar y desactivar"
        />
      </div>
      <UsersCard
        users={users}
        total={total}
        activeUsers={kpis.activeUsers}
        pendingInvitations={kpis.pendingInvitations}
        roles={roles}
        stores={stores}
        canManage={canManage}
        hasAppliedFilters={!!(search || roleId || status)}
      />
    </>
  )
}

async function RolesTabContent({
  roleId,
  canManage,
}: {
  roleId: string | undefined
  canManage: boolean
}) {
  const roles = await listRoles()
  const selectedRoleId = roleId ?? roles[0]?.id

  if (!selectedRoleId) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
        <p className="py-16 text-sm text-muted-foreground">
          Todavía no hay roles configurados.
        </p>
      </div>
    )
  }

  const roleDetail = await getRoleDetail(selectedRoleId)
  if (!roleDetail) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
        <p className="py-16 text-sm text-muted-foreground">
          No se encontró el rol seleccionado.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 items-start gap-3.5">
      <RolesList
        roles={roles}
        selectedRoleId={selectedRoleId}
        canManage={canManage}
      />
      <RoleDetailPanel
        key={roleDetail.id}
        roleDetail={roleDetail}
        canManage={canManage}
      />
    </div>
  )
}

async function InvitationsTabContent({ canManage }: { canManage: boolean }) {
  const invitations = await listInvitations()

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex-1">
          <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
            Invitaciones
          </p>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(invitations.length)} en total
          </p>
        </div>
      </div>
      {invitations.length === 0 ? (
        <p className="px-[22px] pb-6 text-sm text-muted-foreground">
          Todavía no se ha invitado a nadie. Invita a tu equipo desde la pestaña
          Usuarios.
        </p>
      ) : (
        <InvitationsTable invitations={invitations} canManage={canManage} />
      )}
    </div>
  )
}
