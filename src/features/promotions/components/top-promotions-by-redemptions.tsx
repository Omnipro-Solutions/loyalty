import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { TopPromotionByRedemptions } from "../lib/queries"

type TopPromotionsByRedemptionsProps = {
  promotions: TopPromotionByRedemptions[]
}

/**
 * Adaptado de "Widget / Top list" (731:449 / 1032:4378, ver
 * `features/dashboard/components/top-campaigns-list.tsx`) — sin selector de
 * periodo: no hay filtro de fecha real detrás de `canjes` (es un contador de
 * fila, no un evento con timestamp).
 */
export function TopPromotionsByRedemptions({
  promotions,
}: TopPromotionsByRedemptionsProps) {
  if (promotions.length === 0) {
    return (
      <div className="flex w-full flex-col items-start gap-1.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
        <p className="text-sm leading-5 font-semibold text-foreground">
          Top 5 promociones por canjes
        </p>
        <p className="text-[11px] leading-[15px] text-muted-foreground">
          Ninguna promoción registra canjes todavía.
        </p>
      </div>
    )
  }

  const max = Math.max(...promotions.map((p) => p.canjes))

  return (
    <div className="flex w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <p className="text-sm leading-5 font-semibold text-foreground">
        Top 5 promociones por canjes
      </p>
      <div className="flex w-full flex-col gap-1.5">
        {promotions.map((promotion, index) => {
          const rank = index + 1
          const widthPct = Math.max(18, (promotion.canjes / max) * 100)
          const isTop = rank === 1
          return (
            <div
              key={promotion.id}
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
                  {rank}
                </span>
                <p className="min-w-0 flex-1 truncate text-xs leading-[17px] font-medium text-foreground">
                  {promotion.nombre}
                </p>
              </div>
              <p className="relative shrink-0 text-xs leading-[17px] font-semibold text-foreground">
                {formatNumber(promotion.canjes)} canjes
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
