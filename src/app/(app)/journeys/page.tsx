import { Workflow } from "lucide-react"

import { AppPage } from "@/components/layout/app-page"
import { EmptyState } from "@/components/feedback/empty-state"
import { JourneysKpiRow } from "@/features/builder/canvas/journeys-kpis"
import { JourneysPagination } from "@/features/builder/canvas/journeys-pagination"
import { JourneysTable } from "@/features/builder/canvas/journeys-table"
import { JourneysToolbar } from "@/features/builder/canvas/journeys-toolbar"
import { NewJourneyButton } from "@/features/builder/canvas/new-journey-button"
import {
  getJourneysKpis,
  listWorkflows,
} from "@/features/builder/canvas/queries"
import type { WorkflowStatus } from "@/types/domain"

const PAGE_SIZE = 25

export default async function JourneysPage({
  searchParams,
}: PageProps<"/journeys">) {
  const params = await searchParams
  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const status = typeof params.estado === "string" ? params.estado : undefined
  const q = typeof params.q === "string" ? params.q : undefined

  const [{ items, total }, kpis] = await Promise.all([
    listWorkflows({
      page,
      pageSize: PAGE_SIZE,
      status: status as WorkflowStatus | undefined,
      q,
    }),
    getJourneysKpis(),
  ])

  const noFilterResults = total === 0 && (!!status || !!q)
  const noJourneysYet = total === 0 && !status && !q

  return (
    <AppPage breadcrumb="Comercial  ›  Loyalty Builder" title="Loyalty Builder">
      <JourneysKpiRow />

      <div className="w-full rounded-[20px] bg-background shadow-form-section">
        <div className="px-[22px]">
          <JourneysToolbar
            total={total}
            published={kpis.active}
            drafts={kpis.drafts}
            paused={kpis.paused}
            membersInJourney="—"
            visibleItems={items}
          />
        </div>

        {noJourneysYet ? (
          <div className="px-[22px] pb-6">
            <EmptyState
              icon={Workflow}
              title="Todavía no hay workflows"
              description="Crea el primero para empezar a automatizar el recorrido de tus socios de lealtad."
            >
              <NewJourneyButton />
            </EmptyState>
          </div>
        ) : noFilterResults ? (
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
            <JourneysPagination
              total={total}
              pageSize={PAGE_SIZE}
              page={page}
            />
          </>
        )}
      </div>
    </AppPage>
  )
}
