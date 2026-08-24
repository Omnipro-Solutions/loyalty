import { ArrowRight, Workflow } from "lucide-react"

import { KpiCard } from "@/components/data/kpi-card"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { findIntegration } from "../lib/catalog"
import { ACTIVE_CONNECTIONS, type ActiveConnection } from "../lib/connections"

/** Demo estático — todavía no hay un backend real de eventos detrás de las conexiones. */
const EVENTS_PROCESSED_TODAY = 48231

/**
 * Sin equivalente en Figma — "12 · Integraciones" (1261:3974) no dibuja
 * esta pestaña. Resume el flujo orígenes → Loyalty System → destinos a partir de
 * `ACTIVE_CONNECTIONS`.
 */
export function SystemViewCard() {
  const sources = ACTIVE_CONNECTIONS.filter((c) => c.direction === "origen")
  const destinations = ACTIVE_CONNECTIONS.filter(
    (c) => c.direction === "destino"
  )
  const needsAttention = ACTIVE_CONNECTIONS.filter(
    (c) => c.status !== "activa"
  ).length

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-4">
        <KpiCard
          label="Orígenes conectados"
          value={formatNumber(sources.length)}
        />
        <KpiCard
          label="Destinos conectados"
          value={formatNumber(destinations.length)}
        />
        <KpiCard
          label="Eventos procesados hoy"
          value={formatNumber(EVENTS_PROCESSED_TODAY)}
        />
        <KpiCard
          label="Requieren atención"
          value={formatNumber(needsAttention)}
          detail={
            needsAttention > 0 ? "ver Conexiones activas" : "todo en orden"
          }
        />
      </div>

      <div className="flex w-full items-stretch gap-3 rounded-2xl bg-background p-5 shadow-form-section">
        <FlowColumn title="Orígenes" connections={sources} />

        <div className="flex flex-col items-center justify-center px-1">
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="flex w-[180px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Workflow className="size-5" />
          </div>
          <p className="text-[13px] font-semibold text-foreground">
            Loyalty System
          </p>
          <p className="text-[11px] text-muted-foreground">Motor de lealtad</p>
        </div>

        <div className="flex flex-col items-center justify-center px-1">
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <FlowColumn title="Destinos" connections={destinations} />
      </div>
    </div>
  )
}

function FlowColumn({
  title,
  connections,
}: {
  title: string
  connections: ActiveConnection[]
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-[11px] font-semibold tracking-[0.5px] text-muted-foreground uppercase">
        {title}
      </p>
      {connections.map((connection) => {
        const integration = findIntegration(
          connection.integrationId,
          connection.direction
        )
        if (!integration) return null
        return (
          <div
            key={connection.integrationId}
            className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tamaño fijo 20px, no vale next/image. */}
            <img src={integration.logo} alt="" className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
              {integration.name}
            </span>
            <span
              className={cn(
                "size-[6px] shrink-0 rounded-full",
                connection.status === "activa"
                  ? "bg-success"
                  : connection.status === "con_error"
                    ? "bg-destructive"
                    : "bg-warning"
              )}
            />
          </div>
        )
      })}
    </div>
  )
}
