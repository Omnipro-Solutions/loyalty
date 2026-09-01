import { Suspense } from "react"

import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { allows, getSessionPermissions } from "@/lib/session-permissions"
import { countPendingWorkflowApprovals } from "@/features/builder/canvas/approval-queries"
import { JourneysContent } from "@/features/builder/canvas/journeys-content"
import { JourneysKpiRow } from "@/features/builder/canvas/journeys-kpis"
import {
  getJourneysKpis,
  listWorkflows,
} from "@/features/builder/canvas/queries"
import {
  enumValue,
  firstValue,
  parsePage,
  parsePageSize,
} from "@/lib/search-params"
import { WORKFLOW_STATUSES } from "@/types/domain"

const DEFAULT_PAGE_SIZE = 25

/** Igual al `size` de cada `ColumnDef` en `journeys-table.tsx`. */
const JOURNEYS_TABLE_COLUMNS = [44, null, 118, 130, 150, 96, 130]

export default async function JourneysPage({
  searchParams,
}: PageProps<"/journeys">) {
  const params = await searchParams
  const page = parsePage(params.page)
  const pageSize = parsePageSize(params.pageSize, DEFAULT_PAGE_SIZE)
  const status = enumValue(params.estado, WORKFLOW_STATUSES)
  const q = firstValue(params.q)

  // No dependen de los filtros — `JourneysKpiRow` hace su propia llamada de
  // `kpis` (duplicada, preexistente) y ninguna de las dos necesita boundary.
  const [kpis, pendingApprovals, permissions] = await Promise.all([
    getJourneysKpis(),
    countPendingWorkflowApprovals(),
    getSessionPermissions(),
  ])

  // Sin `await`: se resuelve dentro de `JourneysContent`, ya en el boundary.
  const workflowsPromise = listWorkflows({
    page,
    pageSize,
    status,
    q,
  })

  // `q` ya llega debounced (350ms) desde `JourneysToolbar` antes de tocar la
  // URL, así que incluirla aquí no remonta por cada tecla — solo cuando la
  // búsqueda se asienta (el input, no controlado, no pierde texto al
  // remontar — ver el docblock de `JourneysContent`).
  const dataKey = `${q ?? ""}|${status ?? ""}|${page}|${pageSize}`

  return (
    <AppPage breadcrumb="Comercial  ›  Loyalty Builder" title="Loyalty Builder">
      <JourneysKpiRow />

      <div className="w-full rounded-[20px] bg-background shadow-form-section">
        <Suspense
          key={dataKey}
          fallback={
            <>
              <div className="px-[22px] pt-[18px] pb-4">
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
              <TableSkeleton columns={JOURNEYS_TABLE_COLUMNS} paginationRow />
            </>
          }
        >
          <JourneysContent
            workflowsPromise={workflowsPromise}
            kpis={kpis}
            pageSize={pageSize}
            page={page}
            hasFiltersApplied={!!(status || q)}
            pendingApprovals={pendingApprovals}
            canCreate={allows(permissions, "journeys", "crear")}
            canDelete={allows(permissions, "journeys", "eliminar")}
          />
        </Suspense>
      </div>
    </AppPage>
  )
}
