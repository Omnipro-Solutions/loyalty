import { Receipt } from "lucide-react"

import { PlaceholderCard } from "@/components/feedback/placeholder-card"
import { formatUSD, formatNumber, formatPercent } from "@/lib/format"

import { KpiCard } from "./kpi-card"
import type { CommercialValue } from "../lib/queries"

type MemberCommercialKpisProps = { commercialValue: CommercialValue }

/**
 * Figma "Sección · VALOR COMERCIAL" (1186:7) pixel-perfect, real: LTV y
 * margen salen de `pedidos`/`pedido_items`. "Valor previsto 12m" y
 * "Riesgo de fuga" son heurísticas (tendencia de gasto, intervalo entre
 * compras) — no hay modelo de scoring en este proyecto.
 */
export function MemberCommercialKpis({
  commercialValue,
}: MemberCommercialKpisProps) {
  if (commercialValue.totalOrders === 0) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        <p className="w-full text-[9px] font-semibold tracking-[0.72px] text-muted-foreground uppercase">
          Valor comercial
        </p>
        <PlaceholderCard
          icon={Receipt}
          title="Sin pedidos todavía"
          description="LTV, margen, valor previsto y riesgo de fuga aparecen en cuanto el socio tenga compras registradas."
          compact
          className="w-full rounded-[18px]"
        />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      <p className="w-full text-[9px] font-semibold tracking-[0.72px] text-muted-foreground uppercase">
        Valor comercial
      </p>
      <div className="flex w-full items-start gap-3">
        <KpiCard
          label="Ingresos de por vida"
          value={formatUSD(commercialValue.ltv)}
          series={commercialValue.monthlySeries}
          detail={`${formatNumber(commercialValue.totalOrders)} pedidos · ticket ${formatUSD(
            commercialValue.ltv / commercialValue.totalOrders
          )}`}
        />
        <KpiCard
          label="Contribución de margen"
          value={formatUSD(commercialValue.margin)}
          series={commercialValue.monthlySeries}
          detail={
            commercialValue.marginPct !== null
              ? `${formatPercent(commercialValue.marginPct)} · devoluciones ${formatUSD(commercialValue.returns)}`
              : "—"
          }
        />
        <KpiCard
          label="Valor previsto 12m"
          value={formatUSD(commercialValue.projectedValue12m)}
          series={commercialValue.monthlySeries}
          detail={`${formatUSD(commercialValue.projectedMarginValue)} de margen · ±${commercialValue.trendPct}%`}
        />
        <KpiCard
          label="Riesgo de fuga"
          value={`${commercialValue.churnRisk}/100`}
          valueClassName={
            commercialValue.churnRisk >= 60 ? "text-warning" : undefined
          }
          series={commercialValue.monthlySeries}
          strokeClassName={
            commercialValue.churnRisk >= 60 ? "stroke-warning" : undefined
          }
          detail={
            commercialValue.churnRiskDelta !== null
              ? `${commercialValue.churnRiskDelta >= 0 ? "+" : ""}${commercialValue.churnRiskDelta} pts vs. hace 30 días`
              : "sin comparación todavía"
          }
        />
      </div>
    </div>
  )
}
