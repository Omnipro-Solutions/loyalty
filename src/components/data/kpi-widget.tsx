import type { ReactNode } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"

type KpiWidgetProps = {
  label: string
  value: ReactNode
  /** Green pill with an arrow (e.g. "6.2%") — omit if there's no real data backing the variation. */
  delta?: string
  /** Context text next to the delta, or alone (e.g. "No live tracking yet"). */
  caption?: string
}

/**
 * Figma "Widget / KPI · sparkline" (731:399): white card with a label, a
 * large value and a variation pill. The Figma also draws a sparkline next
 * to the value — deliberately omitted here: this card doesn't fake a time
 * series that doesn't exist (there's no historical tracking for these
 * metrics yet). When it exists, a `trend` prop gets added without changing
 * this API's shape.
 */
export function KpiWidget({ label, value, delta, caption }: KpiWidgetProps) {
  const isNegative = delta?.trim().startsWith("-") ?? false

  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-[20px] bg-background px-[18px] py-4 shadow-form-section">
      <p className="text-[11px] leading-[15px] font-medium text-muted-foreground">
        {label}
      </p>
      <p className="text-[22px] leading-7 font-semibold text-foreground">
        {value}
      </p>
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
