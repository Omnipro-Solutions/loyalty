import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import type { TopCampaign } from "../lib/mock-data"

type TopCampaignsListProps = {
  title: string
  subtitle: string
  periodLabel: string
  campaigns: TopCampaign[]
  className?: string
}

/** Figma "Widget / Top list" (731:449 / 1032:4378): ranking con barra de fondo proporcional al valor. */
export function TopCampaignsList({
  title,
  subtitle,
  periodLabel,
  campaigns,
  className,
}: TopCampaignsListProps) {
  const max = Math.max(...campaigns.map((c) => c.amountValue))

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section",
        className
      )}
    >
      <div className="flex w-full items-center gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold text-foreground">
            {title}
          </p>
          <p className="text-[11px] leading-[15px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-1.5 pr-2.5 pl-[11px]">
          <span className="text-[11px] leading-[15px] font-medium text-muted-foreground">
            {periodLabel}
          </span>
          <ChevronDown className="size-2.5 text-muted-foreground" />
        </div>
      </div>

      <div className="flex w-full flex-col gap-1.5">
        {campaigns.map((campaign) => {
          const widthPct = Math.max(18, (campaign.amountValue / max) * 100)
          const isTop = campaign.rank === 1
          return (
            <div
              key={campaign.rank}
              className="relative flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-[10px] px-3 py-[9px]"
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-lg",
                  isTop ? "bg-brand-subtle" : "bg-neutral-50"
                )}
                style={{ width: `${widthPct}%` }}
              />
              <div className="relative flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] leading-[13px] font-semibold",
                    isTop
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-secondary-foreground"
                  )}
                >
                  {campaign.rank}
                </span>
                <p className="min-w-0 flex-1 truncate text-xs leading-[17px] font-medium text-foreground">
                  {campaign.name}
                </p>
              </div>
              <p className="relative shrink-0 text-xs leading-[17px] font-semibold text-foreground">
                {campaign.amount}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
