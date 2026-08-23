import { ArrowDown, ArrowUp } from "lucide-react"

import { formatNumero } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TierNombre } from "@/types/domain"

import { Sparkline } from "./sparkline"
import { TIER_LABEL } from "../lib/labels"
import type {
  ComparacionPrograma,
  DistribucionNivel,
  JourneyVinculado,
  TamanoAudiencia,
} from "../lib/queries"

const TIER_BAR_COLOR: Record<TierNombre, string> = {
  diamante: "bg-data-navy",
  oro: "bg-data-amber",
  plata: "bg-border-strong",
  bronce: "bg-data-coral",
}

function TamanoWidget({ tamano }: { tamano: TamanoAudiencia }) {
  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-[20px] bg-background px-[18px] py-[22px] shadow-form-section">
      <p className="text-[11px] font-medium text-muted-foreground">
        Tamaño de audiencia
      </p>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[24px] font-bold tracking-[-0.6px] text-foreground">
          {formatNumero(tamano.tamanoActual)} perfiles
        </p>
        <Sparkline valores={tamano.serie} className="w-[62px]" />
      </div>
      <div className="flex items-center gap-1.5">
        {tamano.neto !== 0 && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full py-0.5 pr-2 pl-1.5 text-[10px] font-semibold",
              tamano.neto >= 0
                ? "bg-success-bg text-success"
                : "bg-destructive-bg text-destructive"
            )}
          >
            {tamano.neto >= 0 ? (
              <ArrowUp className="size-2.5" />
            ) : (
              <ArrowDown className="size-2.5" />
            )}
            {tamano.neto >= 0 ? "+" : ""}
            {formatNumero(tamano.neto)}
          </span>
        )}
        <p className="text-[10px] text-muted-foreground">últimos 30 días</p>
      </div>
      <div className="flex items-center gap-3.5 border-t border-border pt-3.5 text-[10.5px]">
        <p className="text-muted-foreground">
          Nuevos:{" "}
          <span className="font-semibold text-success">
            +{formatNumero(tamano.nuevos)}
          </span>
        </p>
        <p className="text-muted-foreground">
          Salieron:{" "}
          <span className="font-semibold text-destructive">
            {formatNumero(tamano.salieron)}
          </span>
        </p>
        <p className="text-muted-foreground">
          Neto:{" "}
          <span
            className={cn(
              "font-semibold",
              tamano.neto >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {tamano.neto >= 0 ? "+" : ""}
            {formatNumero(tamano.neto)}
          </span>
        </p>
      </div>
    </div>
  )
}

function NivelWidget({
  distribucion,
  comparacion,
}: {
  distribucion: DistribucionNivel
  comparacion: ComparacionPrograma | null
}) {
  const total = distribucion.reduce((acc, d) => acc + d.cantidad, 0) || 1

  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-[20px] bg-background px-[18px] py-[22px] shadow-form-section">
      <p className="text-[13px] font-medium text-secondary-foreground">
        Distribución por nivel
      </p>
      <div className="flex h-2.5 w-full items-stretch overflow-hidden rounded-full bg-muted">
        {distribucion.map((d) => (
          <div
            key={d.nivel}
            className={TIER_BAR_COLOR[d.nivel]}
            style={{ width: `${(d.cantidad / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {distribucion.map((d) => (
          <div key={d.nivel} className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                TIER_BAR_COLOR[d.nivel]
              )}
            />
            <p className="text-xs text-muted-foreground">
              {TIER_LABEL[d.nivel]} {formatNumero(d.cantidad)}
            </p>
          </div>
        ))}
      </div>
      {comparacion && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-3.5">
          <p className="text-[10.5px] text-muted-foreground">
            vs. base general del programa
          </p>
          <p className="text-[11.5px] font-semibold text-foreground">
            {comparacion.deltaPuntos >= 0 ? "Sobreindexada" : "Subindexada"} en{" "}
            {TIER_LABEL[comparacion.nivel]} ·{" "}
            {comparacion.deltaPuntos >= 0 ? "+" : ""}
            {comparacion.deltaPuntos} pts
          </p>
        </div>
      )}
    </div>
  )
}

function JourneysWidget({
  journeys,
  tamanoAudiencia,
}: {
  journeys: JourneyVinculado[]
  tamanoAudiencia: number
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
                {formatNumero(tamanoAudiencia)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type AudienciaMetricasRowProps = {
  tamano: TamanoAudiencia
  distribucion: DistribucionNivel
  comparacion: ComparacionPrograma | null
  journeys: JourneyVinculado[]
}

/** Figma "11.2 · Audiencia · detalle" (842:6233) — Metrics Row. */
export function AudienciaMetricasRow({
  tamano,
  distribucion,
  comparacion,
  journeys,
}: AudienciaMetricasRowProps) {
  return (
    <div className="flex w-full items-stretch gap-5">
      <TamanoWidget tamano={tamano} />
      <NivelWidget distribucion={distribucion} comparacion={comparacion} />
      <JourneysWidget
        journeys={journeys}
        tamanoAudiencia={tamano.tamanoActual}
      />
    </div>
  )
}
