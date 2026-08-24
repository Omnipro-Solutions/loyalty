import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"

import { MembersPagination } from "./members-pagination"
import { MembersTable } from "./members-table"
import { MEMBERS_PAGE_SIZE } from "../lib/queries"
import type { Member } from "../lib/queries"

type MembersTableSectionProps = {
  membersPromise: Promise<{ members: Member[]; total: number }>
  hasFiltersApplied: boolean
}

/** Comparte la promesa con `MembersCount` — ver el docblock de esa función. */
export async function MembersTableSection({
  membersPromise,
  hasFiltersApplied,
}: MembersTableSectionProps) {
  const { members, total } = await membersPromise

  if (total === 0) {
    return (
      <div className="px-[22px] pb-6">
        <EmptyState
          icon={Users}
          title={
            hasFiltersApplied ? "Sin resultados" : "Todavía no hay clientes"
          }
          description={
            hasFiltersApplied
              ? "Ningún cliente coincide con la búsqueda o el filtro aplicado."
              : "Los clientes aparecerán aquí cuando se inscriban en el programa de lealtad."
          }
        />
      </div>
    )
  }

  return (
    <>
      <MembersTable members={members} />
      <MembersPagination total={total} pageSize={MEMBERS_PAGE_SIZE} />
    </>
  )
}
