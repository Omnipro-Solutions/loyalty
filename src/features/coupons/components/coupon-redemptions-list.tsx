import { formatEventDate, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  COUPON_REDEMPTION_CHANNEL_LABEL,
  COUPON_REDEMPTION_RESULT_DOT,
  COUPON_REDEMPTION_RESULT_LABEL,
} from "../lib/labels"
import type { CouponRedemptionWithStore } from "../lib/queries"

type CouponRedemptionsListProps = { redemptions: CouponRedemptionWithStore[] }

/** Figma 13.4 "Uso y redención": cada intento de uso, aplicado/rechazado/validado. */
export function CouponRedemptionsList({
  redemptions,
}: CouponRedemptionsListProps) {
  if (redemptions.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        Todavía no hay intentos de uso registrados.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {redemptions.map((redemption) => {
        const result =
          redemption.result as keyof typeof COUPON_REDEMPTION_RESULT_LABEL
        const channel =
          redemption.channel as keyof typeof COUPON_REDEMPTION_CHANNEL_LABEL
        return (
          <div
            key={redemption.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "size-[7px] shrink-0 rounded-full",
                  COUPON_REDEMPTION_RESULT_DOT[result]
                )}
              />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">
                  {COUPON_REDEMPTION_RESULT_LABEL[result]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {redemption.tienda?.nombre ?? "Sin tienda"} ·{" "}
                  {COUPON_REDEMPTION_CHANNEL_LABEL[channel]}
                  {redemption.rejection_code
                    ? ` · ${redemption.rejection_code}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {redemption.order_amount != null && (
                <p className="text-[13px] font-medium text-foreground">
                  {formatUSD(redemption.order_amount)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {formatEventDate(redemption.occurred_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
