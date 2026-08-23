import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { formatNumber } from "@/lib/format"

import { TeamPagination } from "./team-pagination"
import { InviteUserDialog } from "./invite-user-dialog"
import { UsersFiltersBar } from "./users-filters-bar"
import { UsersTable } from "./users-table"
import { TEAM_PAGE_SIZE } from "../lib/queries"
import type { RoleWithCount, StoreOption, User } from "../lib/queries"

type UsersCardProps = {
  users: User[]
  total: number
  activeUsers: number
  pendingInvitations: number
  roles: RoleWithCount[]
  stores: StoreOption[]
  canManage: boolean
  hasAppliedFilters: boolean
}

/** Figma "Table" (720:3027): título + conteo + filtros + "Invitar usuario" arriba, tabla, paginación. */
export function UsersCard({
  users,
  total,
  activeUsers,
  pendingInvitations,
  roles,
  stores,
  canManage,
  hasAppliedFilters,
}: UsersCardProps) {
  const noUsersYet = total === 0 && !hasAppliedFilters
  const noFilterResults = total === 0 && hasAppliedFilters

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Usuarios
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumber(total)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(activeUsers)} activos ·{" "}
            {formatNumber(pendingInvitations)} invitaciones pendientes
          </p>
        </div>
        <UsersFiltersBar roles={roles} />
        {canManage && <InviteUserDialog roles={roles} stores={stores} />}
      </div>

      {noUsersYet ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            title="Todavía no hay usuarios"
            description="Invita a tu equipo para que pueda acceder a Loyalty System."
          />
        </div>
      ) : noFilterResults ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            title="Sin resultados"
            description="Ningún usuario coincide con la búsqueda o el filtro aplicado."
          />
        </div>
      ) : (
        <>
          <UsersTable users={users} />
          <TeamPagination total={total} pageSize={TEAM_PAGE_SIZE} />
        </>
      )}
    </div>
  )
}
