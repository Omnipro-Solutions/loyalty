import { ChevronRight, Info, TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { RiskSegment } from "../lib/mock-data"

const RISK_VARIANT: Record<
  RiskSegment["risk"],
  "success" | "warning" | "error"
> = {
  bajo: "success",
  medio: "warning",
  alto: "error",
}

const RISK_LABEL: Record<RiskSegment["risk"], string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
}

type RiskSummaryTableProps = {
  segments: RiskSegment[]
  /** Base total sobre la que se calculan las participaciones de cada fila. */
  totalMembers: number
  highRiskMembers: number
  /** Variación de `highRiskMembers` contra el periodo anterior, en puntos porcentuales enteros. */
  deltaPct: number
  className?: string
}

/**
 * Figma "Widget / Mini tabla con estado" (1028:4384) — "Resumen de riesgo de
 * abandono", con la cifra protagonista y las barras de participación que la
 * versión de Figma no tenía: la tabla sola obliga a dividir cinco números a
 * ojo para saber cuánto pesa cada segmento.
 *
 * Una sola medida en color a lo largo de todo el bloque de riesgo (acá, en
 * `ChurnRiskByTier` y en `ChurnRiskTrend`): miembros en riesgo **alto**, en
 * `--destructive`. Los tres niveles no se pintan como tramos de una misma
 * barra a propósito — `--warning` (#a15c07) y `--destructive` (#e03e3e) se
 * separan sólo ΔE 13,9 a vista normal y 4,5 bajo protanopia (validado con
 * `scripts/validate_palette.js` del skill `dataviz`), así que como rellenos
 * contiguos serían indistinguibles. El nivel de cada segmento sigue estando,
 * pero en el `Badge`, que es color **y** etiqueta.
 */
export function RiskSummaryTable({
  segments,
  totalMembers,
  highRiskMembers,
  deltaPct,
  className,
}: RiskSummaryTableProps) {
  const highRiskShare = totalMembers > 0 ? highRiskMembers / totalMembers : 0
  // Subir el riesgo es malo: la flecha hacia arriba va en rojo, al revés que
  // en un KPI de ventas. Por eso no se reusa `formatDeltaPercent` a secas.
  const worsening = deltaPct >= 0
  const DeltaIcon = worsening ? TrendingUp : TrendingDown

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-start gap-3.5 rounded-[20px] bg-background px-5 pt-5 pb-[18px] shadow-form-section",
        className
      )}
    >
      <div className="flex w-full items-center gap-1.5">
        <p className="flex-1 text-[15px] leading-[21px] font-semibold text-foreground">
          Resumen de riesgo de abandono
        </p>
        <Info className="size-[13px] text-muted-foreground" />
      </div>

      <div className="flex w-full flex-wrap items-end gap-x-2.5 gap-y-1">
        <p className="text-[28px] leading-[34px] font-bold tracking-[-0.8px] text-foreground">
          {formatNumber(highRiskMembers)}
        </p>
        <p className="flex-1 pb-1 text-[13px] leading-[19px] text-muted-foreground">
          miembros en riesgo alto · {formatPercent(highRiskShare)} de la base
        </p>
        <Badge variant={worsening ? "error" : "success"} className="mb-1">
          <DeltaIcon data-icon="inline-start" />
          {worsening ? "+" : ""}
          {formatPercent(deltaPct / 100)} vs. mes anterior
        </Badge>
      </div>

      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${formatPercent(highRiskShare)} de ${formatNumber(totalMembers)} miembros en riesgo alto`}
      >
        <div
          className="h-full rounded-full bg-destructive"
          style={{ width: `${(highRiskShare * 100).toFixed(1)}%` }}
        />
      </div>

      <div className="flex w-full items-center justify-between border-b border-muted pb-2">
        <p className="flex-1 text-[10px] leading-[14px] font-semibold text-muted-foreground">
          SEGMENTO
        </p>
        <p className="w-28 text-[10px] leading-[14px] font-semibold text-muted-foreground">
          MIEMBROS
        </p>
        <p className="w-14 text-right text-[10px] leading-[14px] font-semibold text-muted-foreground">
          RIESGO
        </p>
      </div>

      {/* `flex-1 justify-between`: cuando la columna vecina es más alta, el
          sobrante se reparte entre las filas en vez de acumularse como un
          hueco al pie de la tarjeta. */}
      <div className="flex w-full flex-1 flex-col justify-between">
        {segments.map((segment, i) => {
          const share =
            totalMembers > 0 ? segment.membersCount / totalMembers : 0
          return (
            <div
              key={segment.name}
              className={cn(
                "flex w-full items-center justify-between py-2.5",
                i < segments.length - 1 && "border-b border-muted"
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-px pr-3">
                <p className="text-[13px] leading-[18px] font-medium text-foreground">
                  {segment.name}
                </p>
                <p className="text-[10px] leading-[14px] text-muted-foreground">
                  {segment.description}
                </p>
              </div>
              <div className="flex w-28 flex-col gap-1 pr-3">
                <p className="text-xs leading-[17px] text-secondary-foreground">
                  {formatNumber(segment.membersCount)}
                </p>
                {/* Participación sobre la base, no riesgo: por eso es neutra.
                    El nivel lo dice el badge de al lado. */}
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-muted-foreground/40"
                    style={{ width: `${(share * 100).toFixed(1)}%` }}
                  />
                </div>
              </div>
              <div className="flex w-14 justify-end">
                <Badge variant={RISK_VARIANT[segment.risk]}>
                  {RISK_LABEL[segment.risk]}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="flex items-center gap-1.5 text-xs leading-[17px] font-medium text-primary"
      >
        Ver detalle de segmentos
        <ChevronRight className="size-[13px]" />
      </button>
    </div>
  )
}
