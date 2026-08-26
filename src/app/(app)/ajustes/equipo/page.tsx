import { Suspense } from "react"

import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { RoutePlaceholder } from "@/components/layout/route-placeholder"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import {
  TeamTabsNav,
  type TeamTab,
} from "@/features/team/components/team-tabs-nav"
import { InvitationsTable } from "@/features/team/components/invitations-table"
import { RoleDetailPanel } from "@/features/team/components/role-detail-panel"
import { RolesList } from "@/features/team/components/roles-list"
import { UsersCard } from "@/features/team/components/users-card"
import {
  CountPillSkeleton,
  UsersCount,
} from "@/features/team/components/users-count"
import { UsersTableSection } from "@/features/team/components/users-table-section"
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
import { cn } from "@/lib/utils"

/** Igual al `size` de cada `ColumnDef` en `users-table.tsx`. */
const USERS_TABLE_COLUMNS = [null, 150, 150, 110, 120, 90]

/**
 * Topbar (68px) + padding vertical de `AppPage` (24px arriba + 24px abajo) +
 * `TeamTabsNav` (47px) + el `gap-5` de `AppPage` entre tabs y contenido
 * (20px) = 183px. La pestaña "Roles" es el único listado con panel
 * maestro-detalle (lista de roles + matriz de permisos): en vez de crecer
 * con la página como el resto de tablas, mantiene su propio scroll interno
 * acotado al alto restante del viewport.
 */
const ROLES_PANEL_HEIGHT = "h-[calc(100vh-183px)]"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/** Figma "09 · Equipo y permisos" (725:3563). Ítem propio del sidebar bajo "Configuración" (ver `config/navigation.ts`). */
export default async function TeamPage({
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

  // No dependen de los filtros — se quedan esperados aquí.
  const [kpis, roles, stores] = await Promise.all([
    getTeamKpis(),
    listRoles(),
    listStoreOptions(),
  ])

  // Sin `await`: una sola consulta a `listUsers`, compartida entre el pill
  // de conteo y la tabla.
  const usersPromise = listUsers({ search, roleId, status, page })

  // `search` ya llega debounced (300ms) desde `UsersFiltersBar` (mismo
  // patrón que `MembersFiltersBar`), así que incluirla aquí no remonta por
  // cada tecla — solo cuando la búsqueda se asienta.
  const dataKey = `${search ?? ""}|${roleId ?? ""}|${status ?? ""}|${page}`

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
        activeUsers={kpis.activeUsers}
        pendingInvitations={kpis.pendingInvitations}
        roles={roles}
        stores={stores}
        canManage={canManage}
        count={
          <Suspense key={dataKey} fallback={<CountPillSkeleton />}>
            <UsersCount usersPromise={usersPromise} />
          </Suspense>
        }
      >
        <Suspense
          key={dataKey}
          fallback={
            <TableSkeleton columns={USERS_TABLE_COLUMNS} paginationRow />
          }
        >
          <UsersTableSection
            usersPromise={usersPromise}
            hasFiltersApplied={!!(search || roleId || status)}
          />
        </Suspense>
      </UsersCard>
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
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-background shadow-form-section",
          ROLES_PANEL_HEIGHT
        )}
      >
        <p className="py-16 text-sm text-muted-foreground">
          Todavía no hay roles configurados.
        </p>
      </div>
    )
  }

  const roleDetail = await getRoleDetail(selectedRoleId)
  if (!roleDetail) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-background shadow-form-section",
          ROLES_PANEL_HEIGHT
        )}
      >
        <p className="py-16 text-sm text-muted-foreground">
          No se encontró el rol seleccionado.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex items-start gap-3.5", ROLES_PANEL_HEIGHT)}>
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
