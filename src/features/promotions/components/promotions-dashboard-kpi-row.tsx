import {
  AlertTriangle,
  PlayCircle,
  ReceiptText,
  TrendingUp,
  Wallet,
  WalletCards,
  type LucideIcon,
} from "lucide-react"

import { formatNumber, formatPercent, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { PromotionsDashboardKpis } from "../lib/queries"

type PromotionsDashboardKpiRowProps = { kpis: PromotionsDashboardKpis }

const ICONS = {
  activas: PlayCircle,
  asignado: WalletCards,
  presupuesto: Wallet,
  canjes: ReceiptText,
  roi: TrendingUp,
  alerta: AlertTriangle,
} as const

type PromotionKpiCardProps = {
  label: string
  icon: keyof typeof ICONS
  value: string
  caption: string
  tone?: "promo" | "white"
}

/**
 * Duplicado de `features/dashboard/components/kpi-dense-card.tsx`
 * (aislamiento entre features, CLAUDE.md §2) — mismo look (icono + label,
 * valor con pill de variación en línea, caption), sin `deltaPct` ni
 * `sparkline`: no hay periodo de comparación ni serie histórica real detrás
 * (ver `getPromotionsDashboardKpis`), así que la pill siempre queda en su
 * estado neutral ("—"), el mismo que ya usa ese componente cuando falta el
 * dato.
 */
function PromotionKpiCard({
  label,
  icon,
  value,
  caption,
  tone = "white",
}: PromotionKpiCardProps) {
  const Icon: LucideIcon = ICONS[icon]
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-1 rounded-[20px] px-3.5 py-[11px] shadow-form-section",
        tone === "promo" ? "bg-promo-subtle" : "bg-background"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-[13px] text-muted-foreground" />
        <p className="text-[11px] leading-[14px] font-medium text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="flex-1 text-[22px] leading-7 font-semibold text-foreground">
          {value}
        </p>
        <span className="rounded-full bg-muted px-[7px] py-0.5 text-[10px] leading-[14px] font-semibold whitespace-nowrap text-muted-foreground">
          —
        </span>
      </div>
      <p className="truncate text-[10px] leading-[14px] text-muted-foreground">
        {caption}
      </p>
    </div>
  )
}

export function PromotionsDashboardKpiRow({
  kpis,
}: PromotionsDashboardKpiRowProps) {
  const { statusCounts } = kpis
  // Suma sobre las claves, no una lista fija: así un estado nuevo entra en
  // el total sin tener que acordarse de este sitio.
  const total = Object.values(statusCounts).reduce((acc, n) => acc + n, 0)

  return (
    <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
      <PromotionKpiCard
        icon="activas"
        label="Promociones activas"
        value={formatNumber(statusCounts.activa)}
        caption={`${formatNumber(total)} en total · ${formatNumber(statusCounts.programada)} programadas · ${formatNumber(statusCounts.inactiva)} inactivas · ${formatNumber(statusCounts.borrador)} borrador`}
      />
      <PromotionKpiCard
        icon="asignado"
        label="Presupuesto asignado"
        value={formatUSD(kpis.assignedBudget)}
        caption="Suma de todas las promociones filtradas"
      />
      <PromotionKpiCard
        icon="presupuesto"
        label="Presupuesto consumido"
        value={formatPercent(kpis.consumedBudgetPct)}
        caption={`${formatUSD(kpis.consumedBudget)} consumidos`}
      />
      <PromotionKpiCard
        icon="canjes"
        label="Canjes totales"
        value={formatNumber(kpis.totalRedemptions)}
        caption={
          kpis.avgCostPerRedemption != null
            ? `${formatUSD(kpis.avgCostPerRedemption)} costo promedio por canje`
            : "Sin canjes registrados"
        }
      />
      <PromotionKpiCard
        icon="roi"
        label="ROI promedio"
        value={kpis.avgRoi != null ? `${formatNumber(kpis.avgRoi)} ×` : "—"}
        caption={
          kpis.roiSampleSize > 0
            ? `sobre ${formatNumber(kpis.roiSampleSize)} promociones con ROI registrado`
            : "Ninguna promoción tiene ROI registrado"
        }
        tone="promo"
      />
      <PromotionKpiCard
        icon="alerta"
        label="En alerta"
        value={formatNumber(kpis.alertCount)}
        caption="Superan su umbral de presupuesto configurado"
      />
    </div>
  )
}
