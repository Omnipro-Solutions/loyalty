import Link from "next/link"

import { AppPage } from "@/components/layout/app-page"
import {
  averageUptime,
  buildUptimeHistory,
  getAllServices,
  getIntegrationServices,
  getObservabilityTrend,
  resolveIncidents,
  EVENTS_PROCESSED_TODAY,
} from "@/config/system-status"
import { ActiveConnectionsCard } from "@/features/integrations/components/active-connections-card"
import { SystemViewCard } from "@/features/integrations/components/system-view-card"
import {
  ObservabilityTabsNav,
  type ObservabilityTab,
} from "@/features/system-status/components/observability-tabs-nav"
import { IncidentTimeline } from "@/features/system-status/components/incident-timeline"
import { ServiceStatusList } from "@/features/system-status/components/service-status-list"
import { SystemStatusSummary } from "@/features/system-status/components/system-status-summary"
import { TrendMultiLineChart } from "@/features/dashboard/components/trend-multi-line-chart"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Sin equivalente en Figma — pedido de usuario: observabilidad de sistema e
 * integraciones. Combina data simulada de `features/system-status` con lo
 * ya existente de `features/integrations` (legal desde `app`: features no
 * pueden importarse entre sí, CLAUDE.md §2). Ver también la contraparte
 * pública `/estado`.
 */
export default async function ObservabilityPage({
  searchParams,
}: PageProps<"/ajustes/observabilidad">) {
  const params = await searchParams
  const tab = (firstValue(params.tab) ?? "sistema") as ObservabilityTab

  const services = getAllServices()
  const incidents = resolveIncidents()
  const openIncidents = incidents.filter((i) => i.resolvedAt === null).length
  const averageUptime90d =
    services.reduce(
      (acc, service) => acc + averageUptime(buildUptimeHistory(service.id, 90)),
      0
    ) / services.length
  const { xLabels, series } = getObservabilityTrend()
  const latencyP95Ms = Math.max(...series[0].values)

  return (
    <AppPage
      breadcrumb="Configuración  ›  Observabilidad"
      title="Observabilidad"
    >
      <div className="flex items-center justify-between gap-3">
        <ObservabilityTabsNav active={tab} />
        <Link
          href="/estado"
          target="_blank"
          className="text-xs font-medium text-secondary-foreground hover:underline"
        >
          Ver página pública de estado
        </Link>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Datos simulados con fines de demostración — no hay un sistema de
        monitoreo real detrás.
      </p>

      {tab === "sistema" && (
        <div className="flex flex-col gap-4">
          <SystemStatusSummary
            averageUptime90d={averageUptime90d}
            openIncidents={openIncidents}
            latencyP95Ms={latencyP95Ms}
            eventsToday={EVENTS_PROCESSED_TODAY}
          />
          <TrendMultiLineChart
            title="Latencia y eventos (últimas 24 h)"
            bigValue={`${latencyP95Ms} ms`}
            bigValueCaption="latencia p95 pico"
            xLabels={xLabels}
            series={series}
            dualAxis
          />
          <ServiceStatusList services={services} />
        </div>
      )}

      {tab === "integraciones" && (
        <div className="flex flex-col gap-4">
          <SystemViewCard />
          <ActiveConnectionsCard />
          <ServiceStatusList services={getIntegrationServices()} />
        </div>
      )}

      {tab === "incidentes" && (
        <IncidentTimeline incidents={incidents} services={services} />
      )}
    </AppPage>
  )
}
