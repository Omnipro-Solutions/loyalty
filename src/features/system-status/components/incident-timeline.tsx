import {
  INCIDENT_SEVERITY_DOT,
  INCIDENT_SEVERITY_LABEL,
  type Incident,
  type SystemService,
} from "@/config/system-status"
import { Badge } from "@/components/ui/badge"
import { formatEventDate } from "@/lib/format"
import { cn } from "@/lib/utils"

const UPDATE_STATUS_LABEL: Record<
  Incident["updates"][number]["status"],
  string
> = {
  investigando: "Investigando",
  identificado: "Identificado",
  monitoreando: "Monitoreando",
  resuelto: "Resuelto",
}

type IncidentTimelineProps = {
  incidents: Incident[]
  services: SystemService[]
}

/** Rail de puntos + línea, mismo patrón que `coupon-event-timeline.tsx` — orden cronológico descendente por incidente. */
export function IncidentTimeline({
  incidents,
  services,
}: IncidentTimelineProps) {
  if (incidents.length === 0) {
    return (
      <p className="rounded-2xl bg-background px-5 py-6 text-center text-sm text-muted-foreground shadow-form-section">
        No hay incidentes registrados en los últimos 90 días.
      </p>
    )
  }

  const sorted = [...incidents].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((incident) => {
        const affected = incident.affectedServiceIds
          .map((id) => services.find((s) => s.id === id)?.name)
          .filter((name): name is string => Boolean(name))

        return (
          <div
            key={incident.id}
            className="flex flex-col gap-3 rounded-2xl bg-background px-5 py-4 shadow-form-section"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    INCIDENT_SEVERITY_DOT[incident.severity]
                  )}
                />
                <p className="text-[13px] font-semibold text-foreground">
                  {incident.title}
                </p>
                <Badge variant="neutral">
                  {INCIDENT_SEVERITY_LABEL[incident.severity]}
                </Badge>
                {incident.resolvedAt === null && (
                  <Badge variant="warning">En curso</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatEventDate(incident.startedAt)}
              </p>
            </div>

            {affected.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Afecta a: {affected.join(", ")}
              </p>
            )}

            <div className="flex flex-col">
              {incident.updates.map((update, index) => (
                <div key={`${incident.id}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-strong" />
                    {index < incident.updates.length - 1 && (
                      <span className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {UPDATE_STATUS_LABEL[update.status]}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {update.message}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                      {formatEventDate(update.at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
