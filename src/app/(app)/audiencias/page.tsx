import { KpiWidget } from "@/components/data/kpi-widget"
import { AppPage } from "@/components/layout/app-page"
import { AudiencesCard } from "@/features/audiences/components/audiences-card"
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

/** Figma "11.1 · Audiencias · listado" (842:5955). */
export default async function AudienciasPage({
  searchParams,
}: PageProps<"/audiencias">) {
  const params = await searchParams
  const busqueda = primerValor(params.q)
  const sort = (primerValor(params.sort) ?? "tamano") as AudiencesSort
  const dir = primerValor(params.dir) === "asc" ? "asc" : "desc"
  const page = Number(primerValor(params.page) ?? "1")

  const [{ audiences, total }, kpis] = await Promise.all([
    listAudiences({ search: busqueda, page, sort, dir }),
    getAudiencesKpis(),
  ])

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
        audiences={audiences}
        total={total}
        hasAppliedFilters={!!busqueda}
        sort={sort}
        dir={dir}
      />
    </AppPage>
  )
}
