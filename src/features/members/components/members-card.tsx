import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { formatNumber } from "@/lib/format"

import { MembersFiltersBar } from "./members-filters-bar"
import { MembersPagination } from "./members-pagination"
import { MembersTable } from "./members-table"
import { MEMBERS_PAGE_SIZE } from "../lib/queries"
import type { Member, TierOption } from "../lib/queries"

type MembersCardProps = {
  members: Member[]
  total: number
  tiers: TierOption[]
  hasFiltersApplied: boolean
}

/** Figma "05.1 · Clientes · listado" (704:3012): título + conteo + filtros arriba, tabla, paginación. */
export function MembersCard({
  members,
  total,
  tiers,
  hasFiltersApplied,
}: MembersCardProps) {
  const noMembersYet = total === 0 && !hasFiltersApplied
  const noFilterResults = total === 0 && hasFiltersApplied

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-2.5 px-[22px] py-4">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
              Clientes
            </p>
            <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {formatNumber(total)}
            </span>
          </div>
        </div>
        <MembersFiltersBar tiers={tiers} />
      </div>

      {noMembersYet ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            title="Todavía no hay clientes"
            description="Los clientes aparecerán aquí cuando se inscriban en el programa de lealtad."
          />
        </div>
      ) : noFilterResults ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            title="Sin resultados"
            description="Ningún cliente coincide con la búsqueda o el filtro aplicado."
          />
        </div>
      ) : (
        <>
          <MembersTable members={members} />
          <MembersPagination total={total} pageSize={MEMBERS_PAGE_SIZE} />
        </>
      )}
    </div>
  )
}
