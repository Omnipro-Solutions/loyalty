import { cn } from "@/lib/utils"

import { Sparkline } from "./sparkline"

type KpiCardProps = {
  label: string
  value: string
  valueClassName?: string
  series: number[]
  strokeClassName?: string
  detail: string
  detailClassName?: string
}

/** Tarjeta de KPI compartida por "Programa de lealtad" y "Valor comercial" (1186:4825, 1186:7) — mismo chrome, distintos datos. */
export function KpiCard({
  label,
  value,
  valueClassName,
  series,
  strokeClassName,
  detail,
  detailClassName,
}: KpiCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-[5px] rounded-[18px] bg-background px-4 py-3.5 shadow-form-section">
      <p className="w-full text-[10px] font-medium text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "w-full text-xl font-bold text-foreground",
          valueClassName
        )}
      >
        {value}
      </p>
      <Sparkline values={series} strokeClassName={strokeClassName} />
      <p
        className={cn(
          "w-full text-[10px] text-muted-foreground",
          detailClassName
        )}
      >
        {detail}
      </p>
    </div>
  )
}
