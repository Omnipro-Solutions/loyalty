import { Users } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"

import { AudiencesPagination } from "./audiences-pagination"
import { AudiencesTable } from "./audiences-table"
import { AUDIENCES_PAGE_SIZE } from "../lib/queries"
import type { AudienceListItem, AudiencesSort } from "../lib/queries"

type AudiencesTableSectionProps = {
  audiencesPromise: Promise<{ audiences: AudienceListItem[]; total: number }>
  hasFiltersApplied: boolean
  sort: AudiencesSort
  dir: "asc" | "desc"
}

/** Comparte la promesa con `AudiencesCount`/`AudiencesExportSection` — ver el docblock de esa función. */
export async function AudiencesTableSection({
  audiencesPromise,
  hasFiltersApplied,
  sort,
  dir,
}: AudiencesTableSectionProps) {
  const { audiences, total } = await audiencesPromise

  if (total === 0) {
    return (
      <div className="px-[22px] pb-6">
        <EmptyState
          icon={Users}
          title={
            hasFiltersApplied ? "Sin resultados" : "Todavía no hay audiencias"
          }
          description={
            hasFiltersApplied
              ? "Ninguna audiencia coincide con la búsqueda aplicada."
              : "Las audiencias se definen desde el Loyalty Builder — en cuanto exista un segmento, aparece aquí."
          }
        />
      </div>
    )
  }

  return (
    <>
      <AudiencesTable audiences={audiences} sort={sort} dir={dir} />
      <AudiencesPagination
        total={total}
        defaultPageSize={AUDIENCES_PAGE_SIZE}
      />
    </>
  )
}
