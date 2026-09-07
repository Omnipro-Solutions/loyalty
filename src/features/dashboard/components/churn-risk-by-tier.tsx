import { Info } from "lucide-react"

import { formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChurnRiskTier } from "../lib/mock-data"

type ChurnRiskByTierProps = {
  tiers: ChurnRiskTier[]
  className?: string
}

/**
 * "Riesgo por nivel" — la misma medida que `RiskSummaryTable` (miembros en
 * riesgo alto, en `--destructive`) cortada por nivel del programa, que es la
 * pregunta que la tabla por segmento no contesta: si la fuga está en la base
 * o si ya tocó a los niveles altos.
 *
 * Cada barra es un medidor sobre la base de SU nivel, de 0 a 100 %, no una
 * barra a escala común recortada al máximo de la serie: los niveles tienen
 * tamaños muy distintos (620 vs. 3.656 miembros) y comparar los valores
 * absolutos escondería que el porcentaje de Bronce quintuplica al de
 * Diamante. Por eso el conteo va escrito al lado — la barra dice proporción,
 * el texto dice volumen.
 *
 * HTML plano en vez de Recharts a propósito, igual que la lista de
 * `ChannelAttributionWidget`: son cuatro medidores, no un plano cartesiano,
 * y meterlos en un SVG sólo costaría un `"use client"` de más.
 */
export function ChurnRiskByTier({ tiers, className }: ChurnRiskByTierProps) {
  const totalHighRisk = tiers.reduce((acc, t) => acc + t.highRiskMembers, 0)
  // Por conteo y no por tasa, porque es lo que dice el pie de la tarjeta:
  // dónde está la MASA del riesgo, no dónde es más intenso (que en un nivel
  // chico como Diamante puede ser alto y aun así irrelevante en volumen).
  const largest = tiers.reduce((a, b) =>
    b.highRiskMembers > a.highRiskMembers ? b : a
  )
  const largestShare =
    totalHighRisk > 0 ? largest.highRiskMembers / totalHighRisk : 0

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section",
        className
      )}
    >
      <div className="flex w-full items-start gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold text-foreground">
            Riesgo por nivel
          </p>
          <p className="text-[11px] leading-[15px] text-muted-foreground">
            Miembros en riesgo alto sobre la base de cada nivel
          </p>
        </div>
        <Info className="mt-0.5 size-[13px] shrink-0 text-muted-foreground" />
      </div>

      {/* Igual que en `RiskSummaryTable`: el sobrante de altura se reparte
          entre los niveles y no queda como un hueco al pie. */}
      <div className="flex w-full flex-1 flex-col justify-between gap-3">
        {tiers.map((tier) => {
          const share =
            tier.members > 0 ? tier.highRiskMembers / tier.members : 0
          return (
            <div
              key={tier.tier}
              className="flex w-full flex-col gap-1.5"
              title={`${tier.label}: ${formatNumber(tier.highRiskMembers)} de ${formatNumber(tier.members)} miembros en riesgo alto`}
            >
              <div className="flex w-full items-baseline gap-2">
                <p className="flex-1 text-xs leading-[17px] font-medium text-foreground">
                  {tier.label}
                </p>
                <p className="text-[11px] leading-[15px] text-muted-foreground">
                  {formatNumber(tier.highRiskMembers)} de{" "}
                  {formatNumber(tier.members)}
                </p>
                <p className="w-12 text-right text-xs leading-[17px] font-semibold text-foreground">
                  {formatPercent(share)}
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-destructive"
                  style={{ width: `${(share * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="w-full border-t border-muted pt-3 text-[11px] leading-[15px] text-muted-foreground">
        <span className="font-medium text-foreground">{largest.label}</span>{" "}
        concentra el {formatPercent(largestShare)} del riesgo alto del programa.
      </p>
    </div>
  )
}
