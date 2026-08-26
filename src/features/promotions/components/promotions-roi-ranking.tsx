import { ChevronRight, Info } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { formatNumber, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import { PROMOTION_TYPE_LABEL } from "../lib/labels"
import type { PromotionRoiRankingItem } from "../lib/queries"

type PromotionsRoiRankingProps = {
  top: PromotionRoiRankingItem[]
  bottom: PromotionRoiRankingItem[]
}

function RankingRow({
  item,
  isLast,
}: {
  item: PromotionRoiRankingItem
  isLast: boolean
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between py-2.5",
        !isLast && "border-b border-muted"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <p className="truncate text-[13px] leading-[18px] font-medium text-foreground">
          {item.nombre}
        </p>
        <p className="text-[10px] leading-[14px] text-muted-foreground">
          {PROMOTION_TYPE_LABEL[item.tipo]}
        </p>
      </div>
      <p className="w-24 text-xs leading-[17px] text-secondary-foreground">
        {formatNumber(item.canjes)} canjes
      </p>
      <p className="w-28 text-right text-xs leading-[17px] text-secondary-foreground">
        {formatUSD(item.presupuestoConsumido)}
      </p>
      <div className="flex w-14 justify-end">
        <Badge variant={item.roi >= 1 ? "success" : "error"}>
          {formatNumber(item.roi)} ×
        </Badge>
      </div>
    </div>
  )
}

/**
 * Duplicado de `features/dashboard/components/risk-summary-table.tsx`
 * (aislamiento entre features, CLAUDE.md §2) — mismo look (mini tabla con
 * `Badge` de estado, encabezado uppercase, link de detalle), con extremos de
 * `roi` real en vez del riesgo simulado, ver `getPromotionsRoiRanking`.
 */
export function PromotionsRoiRanking({
  top,
  bottom,
}: PromotionsRoiRankingProps) {
  const rows = [...top, ...bottom]

  return (
    <div className="flex w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 pt-5 pb-[18px] shadow-form-section">
      <div className="flex w-full flex-col gap-0.5">
        <div className="flex w-full items-center gap-1.5">
          <p className="flex-1 text-[15px] leading-[21px] font-semibold text-foreground">
            Promociones por ROI
          </p>
          <Info className="size-[13px] text-muted-foreground" />
        </div>
        <p className="text-[11px] leading-[15px] text-muted-foreground">
          Mayor y menor retorno registrado, entre las que ya lo tienen capturado
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-[11px] leading-[15px] text-muted-foreground">
          Ninguna promoción tiene ROI registrado todavía.
        </p>
      ) : (
        <>
          <div className="flex w-full items-center justify-between border-b border-muted pb-2">
            <p className="flex-1 text-[10px] leading-[14px] font-semibold text-muted-foreground">
              PROMOCIÓN
            </p>
            <p className="w-24 text-[10px] leading-[14px] font-semibold text-muted-foreground">
              CANJES
            </p>
            <p className="w-28 text-right text-[10px] leading-[14px] font-semibold text-muted-foreground">
              PRESUPUESTO
            </p>
            <p className="w-14 text-right text-[10px] leading-[14px] font-semibold text-muted-foreground">
              ROI
            </p>
          </div>

          {rows.map((item, i) => (
            <RankingRow
              key={item.id}
              item={item}
              isLast={i === rows.length - 1}
            />
          ))}
        </>
      )}

      <Link
        href="/promociones"
        className="flex items-center gap-1.5 pt-1 text-xs leading-[17px] font-medium text-primary"
      >
        Ver todas las promociones
        <ChevronRight className="size-[13px]" />
      </Link>
    </div>
  )
}
