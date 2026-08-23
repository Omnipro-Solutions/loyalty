import { KpiWidget } from "@/components/data/kpi-widget"
import { AppPage } from "@/components/layout/app-page"
import { AudienciasCard } from "@/features/audiencias/components/audiencias-card"
import {
  getAudienciasKpis,
  listAudiencias,
  type AudienciasSort,
} from "@/features/audiencias/lib/queries"
import { formatNumero, formatPorcentaje } from "@/lib/format"

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

/** `formatPorcentaje` ya antepone "-" a los negativos (Intl) pero no "+" a los positivos — esta sí, para que el signo sea explícito en el pill de variación. */
function formatDeltaPorcentaje(valor: number): string {
  return `${valor >= 0 ? "+" : ""}${formatPorcentaje(valor)}`
}

/** Figma "11.1 · Audiencias · listado" (842:5955). */
export default async function AudienciasPage({
  searchParams,
}: PageProps<"/audiencias">) {
  const params = await searchParams
  const busqueda = primerValor(params.q)
  const sort = (primerValor(params.sort) ?? "tamano") as AudienciasSort
  const dir = primerValor(params.dir) === "asc" ? "asc" : "desc"
  const page = Number(primerValor(params.page) ?? "1")

  const [{ audiencias, total }, kpis] = await Promise.all([
    listAudiencias({ busqueda, page, sort, dir }),
    getAudienciasKpis(),
  ])

  return (
    <AppPage breadcrumb="Comercial  ›  Audiencias" titulo="Audiencias">
      <div className="flex items-start gap-5">
        <KpiWidget
          etiqueta="Total audiencias"
          valor={kpis.totalAudiencias}
          caption="en el programa"
        />
        <KpiWidget
          etiqueta="Perfiles alcanzados (total)"
          valor={formatNumero(kpis.perfilesAlcanzados)}
          delta={
            kpis.perfilesAlcanzadosDeltaPct !== null
              ? formatDeltaPorcentaje(kpis.perfilesAlcanzadosDeltaPct)
              : undefined
          }
          caption="vs mes anterior"
        />
        <KpiWidget
          etiqueta="Sincronizadas con AJO"
          valor={`${formatNumero(kpis.sincronizadas)} de ${formatNumero(kpis.totalAudiencias)}`}
          delta={formatPorcentaje(kpis.coberturaPct)}
          caption="de cobertura"
        />
        <KpiWidget
          etiqueta="Loyalty Rules activas"
          valor={kpis.journeysActivos}
          caption="publicadas actualmente"
        />
      </div>
      <AudienciasCard
        audiencias={audiencias}
        total={total}
        hayFiltrosAplicados={!!busqueda}
        sort={sort}
        dir={dir}
      />
    </AppPage>
  )
}
