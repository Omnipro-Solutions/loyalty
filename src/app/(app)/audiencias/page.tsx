import { Suspense } from "react"

import { KpiWidget } from "@/components/data/kpi-widget"
import { AppPage } from "@/components/layout/app-page"
import { Skeleton } from "@/components/feedback/skeleton"
import { TableSkeleton } from "@/components/feedback/table-skeleton"
import { AudiencesCard } from "@/features/audiences/components/audiences-card"
import {
  AudiencesCount,
  CountPillSkeleton,
} from "@/features/audiences/components/audiences-count"
import { AudiencesExportSection } from "@/features/audiences/components/audiences-export-section"
import { AudiencesTableSection } from "@/features/audiences/components/audiences-table-section"
import {
  getAudiencesKpis,
  listAudiences,
  type AudiencesSort,
} from "@/features/audiences/lib/queries"
import { formatNumber, formatPercent } from "@/lib/format"

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

/** `formatPercent` ya antepone "-" a los negativos (Intl) pero no "+" a los positivos — esta sí, para que el signo sea explícito en el pill de variación. */
function formatDeltaPercent(valor: number): string {
  return `${valor >= 0 ? "+" : ""}${formatPercent(valor)}`
}

/** Igual al `size` de cada `ColumnDef` en `audiences-table.tsx`. */
const AUDIENCES_TABLE_COLUMNS = [44, null, 130, 96, 150, 110, 110, 80]

/** Figma "11.1 · Audiencias · listado" (842:5955). */
export default async function AudiencesPage({
  searchParams,
}: PageProps<"/audiencias">) {
  const params = await searchParams
  const busqueda = primerValor(params.q)
  const sort = (primerValor(params.sort) ?? "tamano") as AudiencesSort
  const dir = primerValor(params.dir) === "asc" ? "asc" : "desc"
  const page = Number(primerValor(params.page) ?? "1")

  // No depende de los filtros — se queda esperada aquí.
  const kpis = await getAudiencesKpis()

  // Sin `await`: la comparten el pill, el botón de exportar y la tabla.
  const audiencesPromise = listAudiences({ search: busqueda, page, sort, dir })

  // `busqueda` ya llega debounced (300ms), así que incluirla aquí no
  // remonta por cada tecla — solo cuando se asienta. Remonta también al
  // cambiar de orden o de página.
  const dataKey = `${busqueda ?? ""}|${sort}|${dir}|${page}`

  return (
    <AppPage breadcrumb="Comercial  ›  Audiencias" title="Audiencias">
      <div className="flex items-start gap-5">
        <KpiWidget
          label="Total audiencias"
          value={kpis.totalAudiences}
          caption="en el programa"
        />
        <KpiWidget
          label="Perfiles alcanzados (total)"
          value={formatNumber(kpis.reachedProfiles)}
          delta={
            kpis.reachedProfilesDeltaPct !== null
              ? formatDeltaPercent(kpis.reachedProfilesDeltaPct)
              : undefined
          }
          caption="vs mes anterior"
        />
        <KpiWidget
          label="Sincronizadas con AJO"
          value={`${formatNumber(kpis.synced)} de ${formatNumber(kpis.totalAudiences)}`}
          delta={formatPercent(kpis.coveragePct)}
          caption="de cobertura"
        />
        <KpiWidget
          label="Loyalty Rules activas"
          value={kpis.activeJourneys}
          caption="publicadas actualmente"
        />
      </div>
      <AudiencesCard
        count={
          <Suspense key={dataKey} fallback={<CountPillSkeleton />}>
            <AudiencesCount audiencesPromise={audiencesPromise} />
          </Suspense>
        }
        exportButton={
          <Suspense fallback={<Skeleton className="h-9 w-24 rounded-[10px]" />}>
            <AudiencesExportSection audiencesPromise={audiencesPromise} />
          </Suspense>
        }
      >
        <Suspense
          key={dataKey}
          fallback={
            <TableSkeleton
              columns={AUDIENCES_TABLE_COLUMNS}
              leadingAvatar={false}
              headerClassName="bg-neutral-50"
              paginationRow
            />
          }
        >
          <AudiencesTableSection
            audiencesPromise={audiencesPromise}
            hasFiltersApplied={!!busqueda}
            sort={sort}
            dir={dir}
          />
        </Suspense>
      </AudiencesCard>
    </AppPage>
  )
}
