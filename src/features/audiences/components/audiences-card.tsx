import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"
import { formatNumber } from "@/lib/format"

import { AudiencesSearch } from "./audiences-search"
import { AudiencesPagination } from "./audiences-pagination"
import { AudiencesTable } from "./audiences-table"
import { ExportAudiencesButton } from "./export-audiences-button"
import { AUDIENCES_PAGE_SIZE } from "../lib/queries"
import type { AudienceListItem, AudiencesSort } from "../lib/queries"

type AudiencesCardProps = {
  audiences: AudienceListItem[]
  total: number
  hasAppliedFilters: boolean
  sort: AudiencesSort
  dir: "asc" | "desc"
}

/** Figma "11.1 · Audiencias · listado" (842:5955): título + conteo + buscador/exportar arriba, tabla, paginación. */
export function AudiencesCard({
  audiences,
  total,
  hasAppliedFilters,
  sort,
  dir,
}: AudiencesCardProps) {
  const noAudiencesYet = total === 0 && !hasAppliedFilters
  const noFilterResults = total === 0 && hasAppliedFilters

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section">
      <div className="flex items-center gap-3 px-[22px] py-4">
        <div className="flex flex-1 items-center gap-2">
          <p className="text-[17px] font-bold tracking-[-0.3px] text-foreground">
            Audiencias
          </p>
          <span className="rounded-full bg-muted px-[9px] py-0.5 text-[11px] font-semibold text-secondary-foreground">
            {formatNumber(total)}
          </span>
        </div>
        <AudiencesSearch />
        <ExportAudiencesButton audiences={audiences} />
      </div>

      {noAudiencesYet ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            title="Todavía no hay audiencias"
            description="Las audiencias se definen desde el Loyalty Builder — en cuanto exista un segmento, aparece aquí."
          />
        </div>
      ) : noFilterResults ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Users}
            title="Sin resultados"
            description="Ninguna audiencia coincide con la búsqueda aplicada."
          />
        </div>
      ) : (
        <>
          <AudiencesTable audiences={audiences} sort={sort} dir={dir} />
          <AudiencesPagination total={total} pageSize={AUDIENCES_PAGE_SIZE} />
        </>
      )}
    </div>
  )
}
