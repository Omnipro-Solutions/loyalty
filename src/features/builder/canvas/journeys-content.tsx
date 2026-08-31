import { Workflow } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"

import { JourneysPagination } from "./journeys-pagination"
import { JourneysTable } from "./journeys-table"
import { JourneysToolbar } from "./journeys-toolbar"
import { NewJourneyButton } from "./new-journey-button"
import type { WorkflowListItem } from "./queries"

type JourneysContentProps = {
  workflowsPromise: Promise<{ items: WorkflowListItem[]; total: number }>
  kpis: { active: number; drafts: number; paused: number }
  pageSize: number
  page: number
  hasFiltersApplied: boolean
  pendingApprovals: number
}

/**
 * `JourneysToolbar` entero (incluida su barra de búsqueda) vive dentro del
 * `<Suspense>` que envuelve este componente: a diferencia de
 * `MembersFiltersBar`, usa un input no controlado (`defaultValue`), así que
 * remontarlo no pierde texto ni rompe su debounce interno — solo resetea al
 * `q` ya vigente en la URL. Eso evita tener que separar un pill de conteo
 * aparte: el toolbar también necesita `total` (`kpis`/`published`), que
 * solo se conoce al resolver `workflowsPromise`.
 */
export async function JourneysContent({
  workflowsPromise,
  kpis,
  pageSize,
  page,
  hasFiltersApplied,
  pendingApprovals,
}: JourneysContentProps) {
  const { items, total } = await workflowsPromise

  return (
    <>
      <div className="px-[22px]">
        <JourneysToolbar
          total={total}
          published={kpis.active}
          drafts={kpis.drafts}
          paused={kpis.paused}
          membersInJourney="—"
          pendingApprovals={pendingApprovals}
        />
      </div>

      {total === 0 && !hasFiltersApplied ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Workflow}
            title="Todavía no hay workflows"
            description="Crea el primero para empezar a automatizar el recorrido de tus socios de lealtad."
          >
            <NewJourneyButton />
          </EmptyState>
        </div>
      ) : total === 0 ? (
        <div className="px-[22px] pb-6">
          <EmptyState
            icon={Workflow}
            title="Sin resultados"
            description="Ningún workflow coincide con la búsqueda o el filtro aplicado."
          />
        </div>
      ) : (
        <>
          <JourneysTable workflows={items} />
          <JourneysPagination total={total} pageSize={pageSize} page={page} />
        </>
      )}
    </>
  )
}
