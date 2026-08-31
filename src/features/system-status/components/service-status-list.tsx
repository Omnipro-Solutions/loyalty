import {
  averageUptime,
  buildUptimeHistory,
  SYSTEM_STATUS_DOT,
  SYSTEM_STATUS_LABEL,
  type ServiceGroup,
  type SystemService,
} from "@/config/system-status"
import { cn } from "@/lib/utils"

import { UptimeStrip } from "./uptime-strip"

const GROUP_LABEL: Record<ServiceGroup, string> = {
  plataforma: "Plataforma",
  integraciones: "Integraciones",
}

type ServiceStatusListProps = { services: SystemService[] }

/** Mismo lenguaje visual que `active-connections-card.tsx`: card blanca + `shadow-form-section`, agrupada por `ServiceGroup`. */
export function ServiceStatusList({ services }: ServiceStatusListProps) {
  const groups = Array.from(new Set(services.map((s) => s.group)))

  return (
    <div className="flex w-full flex-col gap-4">
      {groups.map((group) => (
        <div
          key={group}
          className="flex w-full flex-col overflow-hidden rounded-2xl bg-background shadow-form-section"
        >
          <p className="border-b border-muted px-5 py-3 text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            {GROUP_LABEL[group]}
          </p>
          <div className="flex flex-col divide-y divide-muted">
            {services
              .filter((s) => s.group === group)
              .map((service) => {
                const history = buildUptimeHistory(service.id, 90)
                const uptime = averageUptime(history)
                return (
                  <div
                    key={service.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-[7px] shrink-0 rounded-full",
                            SYSTEM_STATUS_DOT[service.status]
                          )}
                        />
                        <p className="text-[13px] font-semibold text-foreground">
                          {service.name}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {service.description}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-1 sm:w-[280px]">
                      <UptimeStrip history={history} />
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>90 días</span>
                        <span>{uptime}% de uptime</span>
                      </div>
                    </div>
                    <p className="w-[130px] shrink-0 text-right text-xs font-medium text-foreground">
                      {SYSTEM_STATUS_LABEL[service.status]}
                    </p>
                  </div>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
