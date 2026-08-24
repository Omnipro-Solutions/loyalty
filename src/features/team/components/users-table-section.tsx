import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"

import { TeamPagination } from "./team-pagination"
import { UsersTable } from "./users-table"
import { TEAM_PAGE_SIZE } from "../lib/queries"
import type { User } from "../lib/queries"

type UsersTableSectionProps = {
  usersPromise: Promise<{ users: User[]; total: number }>
  hasFiltersApplied: boolean
}

/** Comparte la promesa con `UsersCount` — ver el docblock de esa función. */
export async function UsersTableSection({
  usersPromise,
  hasFiltersApplied,
}: UsersTableSectionProps) {
  const { users, total } = await usersPromise

  if (total === 0) {
    return (
      <div className="px-[22px] pb-6">
        <EmptyState
          icon={Users}
          title={
            hasFiltersApplied ? "Sin resultados" : "Todavía no hay usuarios"
          }
          description={
            hasFiltersApplied
              ? "Ningún usuario coincide con la búsqueda o el filtro aplicado."
              : "Invita a tu equipo para que pueda acceder a Loyalty System."
          }
        />
      </div>
    )
  }

  return (
    <>
      <UsersTable users={users} />
      <TeamPagination total={total} pageSize={TEAM_PAGE_SIZE} />
    </>
  )
}
