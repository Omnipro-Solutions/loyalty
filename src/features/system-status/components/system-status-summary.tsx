import { KpiCard } from "@/components/data/kpi-card"
import { formatNumber, formatPercent } from "@/lib/format"

type SystemStatusSummaryProps = {
  averageUptime90d: number
  openIncidents: number
  latencyP95Ms: number
  eventsToday: number
}

/** Sin equivalente en Figma — fila de `KpiCard`, mismo lenguaje que `SystemViewCard`/`ActiveConnectionsCard`. */
export function SystemStatusSummary({
  averageUptime90d,
  openIncidents,
  latencyP95Ms,
  eventsToday,
}: SystemStatusSummaryProps) {
  return (
    <div className="flex items-start gap-4">
      <KpiCard
        label="Uptime (90 días)"
        value={formatPercent(averageUptime90d / 100)}
      />
      <KpiCard
        label="Incidentes abiertos"
        value={formatNumber(openIncidents)}
        detail={openIncidents > 0 ? "requieren seguimiento" : "todo en orden"}
      />
      <KpiCard
        label="Latencia p95"
        value={`${formatNumber(latencyP95Ms)} ms`}
      />
      <KpiCard
        label="Eventos procesados hoy"
        value={formatNumber(eventsToday)}
      />
    </div>
  )
}
