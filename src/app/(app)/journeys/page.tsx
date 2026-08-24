import { Suspense } from "react"

import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { JourneysContent } from "@/features/builder/canvas/journeys-content"
import { JourneysKpiRow } from "@/features/builder/canvas/journeys-kpis"
import {
  getJourneysKpis,
  listWorkflows,
} from "@/features/builder/canvas/queries"
import type { WorkflowStatus } from "@/types/domain"

const PAGE_SIZE = 25

/** Igual al `size` de cada `ColumnDef` en `journeys-table.tsx`. */
const JOURNEYS_TABLE_COLUMNS = [44, null, 118, 120, 140, 92, 88, 120]

export default async function JourneysPage({
  searchParams,
}: PageProps<"/journeys">) {
  const params = await searchParams
  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const status = typeof params.estado === "string" ? params.estado : undefined
  const q = typeof params.q === "string" ? params.q : undefined

  // No depende de los filtros — `JourneysKpiRow` hace su propia llamada
  // (duplicada, preexistente) y no necesita boundary.
  const kpis = await getJourneysKpis()

  // Sin `await`: se resuelve dentro de `JourneysContent`, ya en el boundary.
  const workflowsPromise = listWorkflows({
    page,
    pageSize: PAGE_SIZE,
    status: status as WorkflowStatus | undefined,
    q,
  })

  // `q` queda fuera de la key a propósito (ver el docblock de
  // `JourneysContent`); `estado`/`page` sí la cambian.
  const dataKey = `${status ?? ""}|${page}`

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
            pageSize={PAGE_SIZE}
            page={page}
            hasFiltersApplied={!!(status || q)}
          />
        </Suspense>
      </div>
    </AppPage>
  )
}
