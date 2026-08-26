import { AlertCircle, AlertTriangle, type LucideIcon } from "lucide-react"

import { formatNumber, formatPercent } from "@/lib/format"

import type { PromotionAlert } from "../lib/queries"

type PromotionAlertsProps = { alerts: PromotionAlert[] }

const ICONS: Record<PromotionAlert["type"], LucideIcon> = {
  presupuesto: AlertTriangle,
  roi: AlertCircle,
}

function alertCopy(alert: PromotionAlert): {
  title: string
  description: string
} {
  if (alert.type === "presupuesto") {
    return {
      title: `${alert.nombre} supera su umbral de presupuesto`,
      description: `${formatPercent(alert.consumedPct)} consumido · umbral configurado ${alert.thresholdPct}%`,
    }
  }
  return {
    title: `${alert.nombre} tiene ROI por debajo de 1×`,
    description: `ROI ${formatNumber(alert.roi)} × — el retorno registrado no cubre lo invertido`,
  }
}

/**
 * Duplicado de `features/dashboard/components/engine-alerts-widget.tsx`
 * (aislamiento entre features, CLAUDE.md §2) — mismo look (filas neutrales
 * `bg-neutral-50`, sin fondo de color por severidad), pero con alertas
 * reales: sobreconsumo de presupuesto y `roi < 1`, ver `getPromotionAlerts`.
 */
export function PromotionAlerts({ alerts }: PromotionAlertsProps) {
  return (
    <div className="flex w-full flex-col items-start gap-2.5 rounded-[20px] bg-background px-4 py-3.5 shadow-form-section">
      <p className="text-sm leading-5 font-semibold text-foreground">Alertas</p>
      {alerts.length === 0 ? (
        <p className="text-[11px] leading-[15px] text-muted-foreground">
          Ninguna promoción dispara una alerta hoy.
        </p>
      ) : (
        alerts.map((alert) => {
          const Icon = ICONS[alert.type]
          const { title, description } = alertCopy(alert)
          return (
            <div
              key={alert.id}
              className="flex w-full items-start gap-2.5 rounded-[10px] bg-neutral-50 px-3 py-2.5"
            >
              <Icon className="mt-px size-[15px] shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-xs leading-4 font-medium text-foreground">
                  {title}
                </p>
                <p className="text-[11px] leading-[15px] text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
