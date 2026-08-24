import type { ReactNode } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { Sparkline } from "@/components/data/sparkline"
import { cn } from "@/lib/utils"

type KpiWidgetProps = {
  label: string
  value: ReactNode
  /** Green pill with an arrow (e.g. "6.2%") — omit if there's no real data backing the variation. */
  delta?: string
  /** Context text next to the delta, or alone (e.g. "No live tracking yet"). */
  caption?: string
  /** Series for the trailing sparkline (731:403) — omit where there's no real time series backing it yet. */
  trend?: number[]
}

/** Figma "Widget / KPI · sparkline" (731:399): white card with a label, a large value, an optional trailing sparkline and a variation pill. */
export function KpiWidget({
  label,
  value,
  delta,
  caption,
  trend,
}: KpiWidgetProps) {
  const isNegative = delta?.trim().startsWith("-") ?? false

  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-[20px] bg-background px-[18px] py-4 shadow-form-section">
      <p className="text-[11px] leading-[15px] font-medium text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-2xl leading-[30px] font-bold tracking-[-0.6px] text-foreground">
          {value}
        </p>
        {trend && (
          <Sparkline values={trend} className="h-6 w-[62px] shrink-0" />
        )}
      </div>
      {(delta || caption) && (
        <div className="flex items-center gap-1.5">
          {delta && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full py-0.5 pr-2 pl-1.5 text-[10px] leading-[14px] font-semibold",
                isNegative
                  ? "bg-destructive-bg text-destructive"
                  : "bg-success-bg text-success"
              )}
            >
              {isNegative ? (
                <ArrowDown className="size-2.5" />
              ) : (
                <ArrowUp className="size-2.5" />
              )}
              {delta}
            </span>
          )}
          {caption && (
            <p className="truncate text-[11px] leading-[15px] text-muted-foreground">
              {caption}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
