import {
  formatUSD,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format"

import { KpiCard } from "./kpi-card"
import {
  POINT_VALUE_USD,
  type Member,
  type LoyaltySummary,
} from "../lib/queries"

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
}

type MemberLoyaltyKpisProps = {
  member: Member
  summary: LoyaltySummary
  programRate: number | null
}

/** Figma "Sección · PROGRAMA DE LEALTAD" (1186:4825) pixel-perfect, con KPIs reales derivados de `points_ledger`. */
export function MemberLoyaltyKpis({
  member,
  summary,
  programRate,
}: MemberLoyaltyKpisProps) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <p className="w-full text-[9px] font-semibold tracking-[0.72px] text-muted-foreground uppercase">
        Programa de lealtad
      </p>
      <div className="flex w-full items-start gap-3">
        <KpiCard
          label="Saldo de puntos"
          value={formatNumber(member.saldo_puntos)}
          series={summary.balanceSeries}
          detail={`equivalen a ${formatUSD(member.saldo_puntos * POINT_VALUE_USD)}`}
        />
        <KpiCard
          label="Por vencer"
          value={formatNumber(summary.pointsExpiringSoon)}
          valueClassName={
            summary.pointsExpiringSoon > 0 ? "text-warning" : undefined
          }
          series={summary.balanceSeries}
          strokeClassName={
            summary.pointsExpiringSoon > 0 ? "stroke-warning" : undefined
          }
          detail={
            summary.nextExpirationDate
              ? `${formatDate(summary.nextExpirationDate)} · en ${daysUntil(summary.nextExpirationDate)} días`
              : "sin vencimientos próximos"
          }
          detailClassName={
            summary.pointsExpiringSoon > 0 ? "text-warning" : undefined
          }
        />
        <KpiCard
          label="Tasa de redención"
          value={
            summary.redemptionRate !== null
              ? formatPercent(summary.redemptionRate)
              : "—"
          }
          series={summary.balanceSeries}
          detail={
            programRate !== null
              ? `promedio del programa ${formatPercent(programRate)}`
              : "sin datos del programa todavía"
          }
          detailClassName="text-success"
        />
        <KpiCard
          label="Pasivo acumulado"
          value={formatUSD(summary.accruedLiability)}
          series={summary.balanceSeries}
          detail="neto de puntos por vencer"
        />
      </div>
    </div>
  )
}
