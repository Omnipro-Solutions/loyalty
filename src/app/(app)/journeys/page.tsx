import { Workflow } from "lucide-react"

import { AppPage } from "@/components/layout/app-page"
import { EmptyState } from "@/components/feedback/empty-state"
import { JourneysKpiRow } from "@/features/builder/canvas/journeys-kpis"
import { JourneysPagination } from "@/features/builder/canvas/journeys-pagination"
import { JourneysTable } from "@/features/builder/canvas/journeys-table"
import { JourneysToolbar } from "@/features/builder/canvas/journeys-toolbar"
import { NuevoJourneyButton } from "@/features/builder/canvas/nuevo-journey-button"
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
  const estado = typeof params.estado === "string" ? params.estado : undefined
  const q = typeof params.q === "string" ? params.q : undefined

  const [{ items, total }, kpis] = await Promise.all([
    listWorkflows({
      page,
      pageSize: PAGE_SIZE,
      estado: estado as WorkflowStatus | undefined,
      q,
    }),
    getJourneysKpis(),
  ])

  const sinResultadosDeFiltro = total === 0 && (!!estado || !!q)
  const sinJourneysAun = total === 0 && !estado && !q

  return (
    <AppPage breadcrumb="Comercial  ›  Loyalty Builder" title="Loyalty Builder">
      <JourneysKpiRow />

      <div className="w-full rounded-[20px] bg-background shadow-form-section">
        <div className="px-[22px]">
          <JourneysToolbar
            total={total}
            publicados={kpis.activos}
            borradores={kpis.borradores}
            pausados={kpis.pausados}
            clientesEnRecorrido="—"
            itemsVisibles={items}
          />
        </div>

        {sinJourneysAun ? (
          <div className="px-[22px] pb-6">
            <EmptyState
              icon={Workflow}
              title="Todavía no hay workflows"
              description="Crea el primero para empezar a automatizar el recorrido de tus socios de lealtad."
            >
              <NuevoJourneyButton />
            </EmptyState>
          </div>
        ) : sinResultadosDeFiltro ? (
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
