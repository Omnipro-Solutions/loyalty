import { KpiWidget } from "@/components/data/kpi-widget"
import { AppPage } from "@/components/layout/app-page"
import { AiCopilotHero } from "@/features/dashboard/components/ai-copilot-hero"
import { InsightEngineCard } from "@/features/dashboard/components/insight-engine-card"
import { RiskSummaryTable } from "@/features/dashboard/components/risk-summary-table"
import { TopCampaignsList } from "@/features/dashboard/components/top-campaigns-list"
import { TrendMultiLineChart } from "@/features/dashboard/components/trend-multi-line-chart"
import {
  RISK_SEGMENTS,
  TOP_CAMPAIGNS,
} from "@/features/dashboard/lib/mock-data"
import { getResumenDashboardData } from "@/features/dashboard/lib/queries"
import { getCurrentProfile } from "@/features/profile/lib/queries"
import { formatDeltaPercent } from "@/lib/format"

/**
 * Figma "02.3 · Dashboard · IA" (1025:4123) — pantalla que se muestra al
 * iniciar sesión. KPIs y tendencia salen de `pedidos`/`members`/
 * `promociones` reales (ver `lib/queries.ts`); riesgo de abandono, insight
 * del motor y top de campañas siguen de ejemplo (`lib/mock-data.ts`): no hay
 * todavía lógica real de "riesgo" ni un modelo de IA detrás.
 */
export default async function ResumenPage() {
  // `(app)/layout.tsx` ya redirige a /login sin sesión, así que el perfil
  // siempre existe aquí.
  const [{ kpis, trend }, profile] = await Promise.all([
    getResumenDashboardData(),
    getCurrentProfile(),
  ])
  const firstName = profile!.nombre.split(" ")[0]

  return (
    <AppPage breadcrumb="Principal  ›  Resumen" title="Resumen">
      <AiCopilotHero name={firstName} />

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiWidget
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            delta={
              kpi.deltaPct !== undefined
                ? formatDeltaPercent(kpi.deltaPct / 100)
                : undefined
            }
            caption={kpi.caption}
            trend={kpi.sparkline}
          />
        ))}
      </div>

      <div className="flex w-full flex-col gap-4">
        <p className="text-[11px] leading-3.5 font-semibold tracking-[0.6px] text-muted-foreground">
          RENDIMIENTO
        </p>
        <div className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-[3fr_2fr]">
          <TrendMultiLineChart
            title={trend.title}
            bigValue={trend.bigValue}
            bigValueCaption={trend.bigValueCaption}
            xLabels={trend.xLabels}
            series={trend.series}
            dualAxis
            className="min-w-0"
          />
          <TopCampaignsList
            title="Top campañas activas"
            subtitle="Por ventas de miembros en los últimos 30 días"
            periodLabel="30 días"
            campaigns={TOP_CAMPAIGNS}
            className="min-w-0"
          />
        </div>
        <div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
          <RiskSummaryTable segments={RISK_SEGMENTS} className="min-w-0" />
          <InsightEngineCard className="min-w-0" />
        </div>
      </div>
    </AppPage>
  )
}
