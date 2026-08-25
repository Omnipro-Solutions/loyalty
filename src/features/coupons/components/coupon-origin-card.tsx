import Link from "next/link"

import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { COUPON_AUDIENCE_MODE_LABEL, formatActorAt } from "../lib/labels"
import type { CouponBatchListItem } from "../lib/queries"

type CouponOriginCardProps = { batch: CouponBatchListItem }

/** Figma 13.4 "Card · Emisión de origen". */
export function CouponOriginCard({ batch }: CouponOriginCardProps) {
  const rows: { label: string; value: string; accent?: boolean }[] = [
    {
      label: "Tamaño del batch",
      value: `${formatNumber(batch.requested_quantity)} cupón${batch.requested_quantity === 1 ? "" : "es"}`,
    },
  ]
  if (batch.audience_name) {
    rows.push({ label: "Audiencia", value: batch.audience_name, accent: true })
  }
  if (batch.audience_mode) {
    rows.push({
      label: "Modo",
      value:
        COUPON_AUDIENCE_MODE_LABEL[batch.audience_mode as "dynamic" | "frozen"],
    })
  }
  if (batch.authorized_by_profile && batch.authorized_at) {
    rows.push({
      label: "Emitido por",
      value: formatActorAt(
        batch.authorized_by_profile.nombre,
        batch.authorized_at
      ),
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-background p-4 shadow-form-section">
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        Emisión de origen
      </p>

      <Link
        href={`/cupones/emisiones/${batch.id}`}
        className="flex items-center justify-between gap-3 rounded-xl bg-accent px-3.5 py-3"
      >
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-semibold text-primary">
            {batch.reference}
          </p>
          <p className="truncate text-xs text-foreground">{batch.name}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-primary">
          Abrir →
        </span>
      </Link>

      <dl className="flex flex-col gap-2 text-xs">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "truncate font-medium",
                row.accent ? "text-primary" : "text-foreground"
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
