import { ArrowDown, ArrowUp } from "lucide-react"

import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TierName } from "@/types/domain"

import { Sparkline } from "./sparkline"
import { TIER_LABEL } from "../lib/labels"
import type {
  AudienceSize,
  LinkedJourney,
  ProgramComparison,
  TierDistribution,
} from "../lib/queries"

const TIER_BAR_COLOR: Record<TierName, string> = {
  diamante: "bg-data-navy",
  oro: "bg-data-amber",
  plata: "bg-border-strong",
  bronce: "bg-data-coral",
}

function SizeWidget({ size }: { size: AudienceSize }) {
  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-[20px] bg-background px-[18px] py-[22px] shadow-form-section">
      <p className="text-[11px] font-medium text-muted-foreground">
        Tamaño de audiencia
      </p>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[24px] font-bold tracking-[-0.6px] text-foreground">
          {formatNumber(size.currentSize)} perfiles
        </p>
        <Sparkline values={size.series} className="w-[62px]" />
      </div>
      <div className="flex items-center gap-1.5">
        {size.net !== 0 && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full py-0.5 pr-2 pl-1.5 text-[10px] font-semibold",
              size.net >= 0
                ? "bg-success-bg text-success"
                : "bg-destructive-bg text-destructive"
            )}
          >
            {size.net >= 0 ? (
              <ArrowUp className="size-2.5" />
            ) : (
              <ArrowDown className="size-2.5" />
            )}
            {size.net >= 0 ? "+" : ""}
            {formatNumber(size.net)}
          </span>
        )}
        <p className="text-[10px] text-muted-foreground">últimos 30 días</p>
      </div>
      <div className="flex items-center gap-3.5 border-t border-border pt-3.5 text-[10.5px]">
        <p className="text-muted-foreground">
          Nuevos:{" "}
          <span className="font-semibold text-success">
            +{formatNumber(size.joined)}
          </span>
        </p>
        <p className="text-muted-foreground">
          Salieron:{" "}
          <span className="font-semibold text-destructive">
            {formatNumber(size.left)}
          </span>
        </p>
        <p className="text-muted-foreground">
          Neto:{" "}
          <span
            className={cn(
              "font-semibold",
              size.net >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {size.net >= 0 ? "+" : ""}
            {formatNumber(size.net)}
          </span>
        </p>
      </div>
    </div>
  )
}

function TierWidget({
  distribution,
  comparison,
}: {
  distribution: TierDistribution
  comparison: ProgramComparison | null
}) {
  const total = distribution.reduce((acc, d) => acc + d.count, 0) || 1

  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-[20px] bg-background px-[18px] py-[22px] shadow-form-section">
      <p className="text-[13px] font-medium text-secondary-foreground">
        Distribución por nivel
      </p>
      <div className="flex h-2.5 w-full items-stretch overflow-hidden rounded-full bg-muted">
        {distribution.map((d) => (
          <div
            key={d.tier}
            className={TIER_BAR_COLOR[d.tier]}
            style={{ width: `${(d.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {distribution.map((d) => (
          <div key={d.tier} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                TIER_BAR_COLOR[d.tier]
              )}
            />
            <p className="text-xs text-muted-foreground">
              {TIER_LABEL[d.tier]} {formatNumber(d.count)}
            </p>
          </div>
        ))}
      </div>
      {comparison && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-3.5">
          <p className="text-[10.5px] text-muted-foreground">
            vs. base general del programa
          </p>
          <p className="text-[11.5px] font-semibold text-foreground">
            {comparison.deltaPoints >= 0 ? "Sobreindexada" : "Subindexada"} en{" "}
            {TIER_LABEL[comparison.tier]} ·{" "}
            {comparison.deltaPoints >= 0 ? "+" : ""}
            {comparison.deltaPoints} pts
          </p>
        </div>
      )}
    </div>
  )
}

function JourneysWidget({
  journeys,
  audienceSize,
}: {
  journeys: LinkedJourney[]
  audienceSize: number
}) {
  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            Journeys vinculados
          </p>
          <p className="text-[11px] text-muted-foreground">
            Usan esta audiencia como entrada
          </p>
        </div>
        <span className="rounded-full bg-muted px-[11px] py-1.5 text-[11px] font-medium text-secondary-foreground">
          Activos
        </span>
      </div>
      {journeys.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Ningún journey publicado usa esta audiencia como entrada todavía.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {journeys.map((journey, i) => (
            <div
              key={journey.id}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5",
                i === 0 ? "bg-brand-subtle" : "bg-neutral-50"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-semibold",
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-secondary-foreground"
                )}
              >
                {i + 1}
              </span>
              <p className="flex-1 truncate text-xs font-medium text-foreground">
                {journey.nombre}
              </p>
              <p className="text-xs font-semibold text-foreground">
                {formatNumber(audienceSize)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type AudienceMetricsRowProps = {
  size: AudienceSize
  distribution: TierDistribution
  comparison: ProgramComparison | null
  journeys: LinkedJourney[]
}

/** Figma "11.2 · Audiencia · detalle" (842:6233) — Metrics Row. */
export function AudienceMetricsRow({
  size,
  distribution,
  comparison,
  journeys,
}: AudienceMetricsRowProps) {
  return (
    <div className="flex w-full items-stretch gap-5">
      <SizeWidget size={size} />
      <TierWidget distribution={distribution} comparison={comparison} />
      <JourneysWidget journeys={journeys} audienceSize={size.currentSize} />
    </div>
  )
}
