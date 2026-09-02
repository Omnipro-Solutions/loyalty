import { cn } from "@/lib/utils"

type KpiFeaturedWidgetProps = {
  label: string
  value: string
  goalBadge: string
  progressPct: number
  caption: string
  className?: string
}

/** Figma "Widget / KPI · destacado" (731:412 / 734:4644): tarjeta de marca con barra de progreso hacia una meta. */
export function KpiFeaturedWidget({
  label,
  value,
  goalBadge,
  progressPct,
  caption,
  className,
}: KpiFeaturedWidgetProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-2.5 rounded-[20px] bg-primary p-[18px] shadow-kpi-featured",
        className
      )}
    >
      <p className="text-xs leading-[17px] font-medium text-primary-100">
        {label}
      </p>
      <div className="flex w-full items-center gap-2">
        <p className="flex-1 text-[30px] leading-[34px] font-bold tracking-[-1px] text-primary-foreground">
          {value}
        </p>
        <span className="shrink-0 rounded-full bg-white/20 px-[9px] py-[3px] text-[11px] leading-[15px] font-medium whitespace-nowrap text-primary-foreground">
          {goalBadge}
        </span>
      </div>
      <div className="h-[7px] w-full overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-kpi-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-[10px] leading-[14px] text-primary-100">{caption}</p>
    </div>
  )
}
