import Link from "next/link"
import { ArrowDown, GitBranch, Workflow } from "lucide-react"

import { formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { JourneyResult } from "../lib/result-queries"

/**
 * "Resultado de la regla" (spec §21-22) — el recorrido, no el canvas.
 *
 * Deliberadamente NO se dibuja el grafo: para editarlo ya está el builder.
 * Aquí solo interesa por dónde avanzó la gente y dónde está la mayor fuga.
 *
 * Dos decisiones que evitan que el bloque mienta:
 *
 * · **Caída ≠ rama.** Un nodo con menos gente que su antecesor puede haber
 *   perdido gente o ser uno de los dos lados de un `cumple`/`no_cumple`.
 *   Se marcan distinto, porque solo el primero es un problema.
 * · **Alcance ≠ cohorte.** El porcentaje sale de la atribución real
 *   (`points_ledger`), no de dividir la cohorte de la corrida entre los
 *   socios: esa cohorte es una proyección y puede superar a toda la base.
 */
export function PromotionsJourneyResult({
  journeys,
}: {
  journeys: JourneyResult[]
}) {
  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] leading-[21px] font-semibold text-foreground">
          Resultado de la regla
        </p>
        <p className="text-xs text-muted-foreground">
          {journeys.length === 1
            ? "La regla del builder que aplica esta promoción"
            : `${formatNumber(journeys.length)} reglas del builder aplican esta promoción`}
        </p>
      </div>

      {journeys.map((journey) => {
        const max = Math.max(...journey.steps.map((s) => s.count), 1)
        // La mayor fuga real es lo que hay que mirar primero — y solo cuenta
        // como fuga lo que no es una rama.
        let worst: string | null = null
        let worstRatio = 0
        for (const step of journey.steps) {
          if (step.inflow?.kind === "caida" && step.inflow.ratio > worstRatio) {
            worstRatio = step.inflow.ratio
            worst = step.nodeId
          }
        }

        return (
          <div
            key={journey.workflowId}
            className="flex flex-col gap-3 border-t border-border pt-3.5 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/journeys/${journey.workflowId}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline"
              >
                <Workflow className="size-3.5 text-muted-foreground" />
                {journey.workflowName}
              </Link>
              <span className="text-[11px] text-muted-foreground">
                Alcance{" "}
                <span className="font-semibold text-foreground">
                  {journey.reach !== null ? formatPercent(journey.reach) : "—"}
                </span>
                {journey.reachMembers !== null
                  ? ` · ${formatNumber(journey.reachMembers)} socios con movimiento atribuido`
                  : " · ningún movimiento de puntos atribuido todavía"}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {journey.steps.map((step, index) => (
                <div key={step.nodeId} className="flex flex-col gap-1.5">
                  {index > 0 && step.inflow && (
                    <div className="flex items-center gap-1.5 pl-1 text-[10px]">
                      {step.inflow.kind === "rama" ? (
                        <>
                          <GitBranch className="size-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            rama · {formatPercent(step.inflow.ratio)} de los que
                            llegaron
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="size-3 text-muted-foreground" />
                          <span
                            className={cn(
                              "text-muted-foreground",
                              step.nodeId === worst &&
                                step.inflow.ratio > 0 &&
                                "font-semibold text-destructive"
                            )}
                          >
                            {step.inflow.ratio > 0
                              ? `−${formatPercent(step.inflow.ratio)}`
                              : "sin caída"}
                            {step.nodeId === worst &&
                              step.inflow.ratio > 0 &&
                              " · mayor caída"}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 shrink-0 rounded-full bg-data-indigo" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs text-foreground">
                        {step.label}
                      </span>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-data-indigo"
                          style={{ width: `${(step.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="text-xs font-semibold text-foreground tabular-nums">
                        {formatNumber(step.count)}
                      </span>
                      {step.share !== null && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {formatPercent(step.share)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* La cohorte de una corrida es una proyección del simulador, no
                socios reales — decirlo evita que se lea como tráfico. */}
            <p className="text-[11px] text-muted-foreground">
              Cohorte de la corrida: {formatNumber(journey.cohort)}. Los
              porcentajes de cada paso son sobre esa cohorte.
            </p>
          </div>
        )
      })}
    </div>
  )
}
