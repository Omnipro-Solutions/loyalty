import { AppPage } from "@/components/layout/app-page"
import { ChannelAttributionWidget } from "@/features/dashboard/components/channel-attribution-widget"
import { DenseDashboardFilters } from "@/features/dashboard/components/dense-dashboard-filters"
import { EngineAlertsWidget } from "@/features/dashboard/components/engine-alerts-widget"
import { KpiDenseCard } from "@/features/dashboard/components/kpi-dense-card"
import { KpiFeaturedWidget } from "@/features/dashboard/components/kpi-featured-widget"
import { StackedBarChartWidget } from "@/features/dashboard/components/stacked-bar-chart-widget"
import { TrendMultiLineChart } from "@/features/dashboard/components/trend-multi-line-chart"
import { ENGINE_ALERTS, FEATURED_KPI } from "@/features/dashboard/lib/mock-data"
import {
  getAnaliticaDashboardData,
  listSegmentOptions,
} from "@/features/dashboard/lib/queries"
import { getCurrentProfile } from "@/features/profile/lib/queries"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Figma "02.1 · Dashboard · denso" (639:1585) — dashboard de analítica,
 * accesible desde el menú. Los filtros de `DenseDashboardFilters`
 * (rango/fechas/comparación/segmento) son reales: 5 de los 6 KPIs densos y
 * las 3 gráficas (canjes por bucket, atribución por canal, tendencia) salen
 * de `pedidos`/`points_ledger`/`members` filtrados por la ventana activa
 * (ver `lib/queries.ts`). `KpiFeaturedWidget` (meta trimestral) y
 * `EngineAlertsWidget` NO responden a los filtros — no hay meta configurable
 * ni motor de alertas real detrás, se quedan de ejemplo
 * (`lib/mock-data.ts`). El 6º KPI denso ("ROI promocional") tampoco: no
 * existe tracking de descuento en el schema.
 */
export default async function AnaliticaPage({
  searchParams,
}: PageProps<"/analitica">) {
  // `(app)/layout.tsx` ya redirige a /login sin sesión, así que el perfil
  // siempre existe aquí.
  const params = await searchParams
  const filters = {
    rango: firstValue(params.rango),
    desde: firstValue(params.desde),
    hasta: firstValue(params.hasta),
    comparar: firstValue(params.comparar),
    segmentoId: firstValue(params.segmento),
  }

  const [data, segments, profile] = await Promise.all([
    getAnaliticaDashboardData(filters),
    listSegmentOptions(),
    getCurrentProfile(),
  ])
  const firstName = profile!.nombre.split(" ")[0]

  return (
    <AppPage breadcrumb="Principal  ›  Analítica" title="Analítica">
      <div className="flex flex-col gap-1">
        <p className="text-[38px] leading-[44px] font-bold tracking-[-1.2px] text-foreground">
          Hola de nuevo, {firstName}
        </p>
        <p className="text-[15px] leading-[22px] text-secondary-foreground">
          Dashboard General de tu promociones
        </p>
      </div>

      <DenseDashboardFilters segments={segments} />

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {data.kpis.map((kpi) => (
          <KpiDenseCard
            key={kpi.label}
            label={kpi.label}
            icon={kpi.icon}
            value={kpi.value}
            deltaPct={kpi.deltaPct}
            deltaLabel={kpi.deltaLabel}
            caption={kpi.caption}
            sparkline={kpi.sparkline}
            tone={kpi.tone}
          />
        ))}
      </div>

      <div className="flex w-full flex-col items-stretch gap-4 xl:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-4 xl:w-[724px] xl:shrink-0">
          <StackedBarChartWidget
            title={data.redemptionsTitle}
            buckets={data.redemptionsByBucket}
            periodTotal={data.periodTotal}
            periodCaption={data.periodCaption}
            highlightedBucket={data.highlightedBucket}
            highlightedCallout={data.highlightedCallout}
            isEmpty={data.isBucketsEmpty}
          />
          <TrendMultiLineChart
            title={data.trend.title}
            bigValue={data.trend.bigValue}
            bigValueCaption={data.trend.bigValueCaption}
            xLabels={data.trend.xLabels}
            series={data.trend.series}
          />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <ChannelAttributionWidget
            channels={data.channelAttribution}
            subtitle="Por canal · histórico completo"
            isEmpty={data.channelIsEmpty}
          />
          <KpiFeaturedWidget
            label={FEATURED_KPI.label}
            value={FEATURED_KPI.value}
            goalBadge={FEATURED_KPI.goalBadge}
            progressPct={FEATURED_KPI.progressPct}
            caption={FEATURED_KPI.caption}
          />
          <EngineAlertsWidget alerts={ENGINE_ALERTS} />
        </div>
      </div>
    </AppPage>
  )
}
