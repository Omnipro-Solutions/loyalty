import { AlertCircle, AlertTriangle, Info, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { EngineAlert } from "../lib/mock-data"

const ICONS: Record<EngineAlert["icon"], LucideIcon> = {
  "alert-triangle": AlertTriangle,
  "alert-circle": AlertCircle,
  info: Info,
}

type EngineAlertsWidgetProps = { alerts: EngineAlert[]; className?: string }

/** Figma "Widget · Alertas del motor" (734:4655). */
export function EngineAlertsWidget({
  alerts,
  className,
}: EngineAlertsWidgetProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-2.5 rounded-[20px] bg-background px-4 py-3.5 shadow-form-section",
        className
      )}
    >
      <p className="text-sm leading-5 font-semibold text-foreground">
        Alertas del motor
      </p>
      {alerts.map((alert) => {
        const Icon = ICONS[alert.icon]
        return (
          <div
            key={alert.title}
            className="flex w-full items-start gap-2.5 rounded-[10px] bg-neutral-50 px-3 py-2.5"
          >
            <Icon className="mt-px size-[15px] shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-xs leading-4 font-medium text-foreground">
                {alert.title}
              </p>
              <p className="text-[11px] leading-[15px] text-muted-foreground">
                {alert.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
