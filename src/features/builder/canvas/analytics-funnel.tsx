import { TrendingDown } from "lucide-react"

import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { findBiggestDrop } from "./analytics-metrics"
import type { RunSummary } from "./analytics-queries"
import type { WorkflowWithGraph } from "./queries"

/**
 * "Caída por nodo" (Figma 08.3, 681:2133): sidebar compacto, sin barras
 * anchas — a diferencia del mockup, que muestra un único camino "principal"
 * a través del journey (omite la rama de push para solo seguir la de
 * email), esta lista muestra TODOS los nodo·puerto de la corrida — elegir
 * cuál rama es "la principal" es un juicio editorial que no se puede
 * calcular de forma objetiva a partir de los conteos, y mostrar de menos
 * sería menos honesto que mostrar de más. Comparte el cálculo de "mayor
 * caída" con `AnalyticsCanvas` (`findBiggestDrop`) para que ambos
 * señalen siempre el mismo hallazgo.
 */
export function AnalyticsFunnel({
  run,
  edges,
}: {
  run: RunSummary
  edges: WorkflowWithGraph["edges"]
}) {
  const rows = run.steps.map((p) => ({
    key: `${p.nodeId}-${p.port ?? "fin"}`,
    nodeId: p.nodeId,
    label: p.label,
    port: p.port,
    // Puerto `null` = nodo terminal — `simulateWorkflow` no le calcula un
    // `conteo_salida` real (no hay a dónde salir), así que se muestra su
    // `entryCount` (los que SÍ llegaron) en su lugar.
    count: p.port === null ? p.entryCount : p.exitCount,
    pct: p.entryCount
      ? Math.round(
          ((p.port === null ? p.entryCount : p.exitCount) / p.entryCount) * 100
        )
      : 0,
  }))

  const biggestDrop = findBiggestDrop(run.steps, edges)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-foreground">
          Caída por nodo
        </p>
        {rows.map((f) => {
          const isBiggestDrop =
            biggestDrop?.nodeId === f.nodeId && biggestDrop.port === f.port
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <p className="min-w-0 truncate text-foreground">
                  {f.label}
                  {f.port && (
                    <span className="text-muted-foreground"> · {f.port}</span>
                  )}
                </p>
                <p className="shrink-0 text-foreground">
                  {formatNumber(f.count)}{" "}
                  <span className="text-muted-foreground">({f.pct}%)</span>
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    isBiggestDrop
                      ? "bg-warning"
                      : f.port === null
                        ? "bg-success"
                        : "bg-primary"
                  )}
                  style={{ width: `${String(f.pct)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {biggestDrop && biggestDrop.pct < 100 && (
        <div className="flex items-start gap-2.5 rounded-xl bg-warning-bg px-3.5 py-3">
          <TrendingDown className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-[12px] leading-[17px] text-foreground">
            <span className="font-semibold">
              Mayor caída: {biggestDrop.label} · {biggestDrop.port}
            </span>{" "}
            — solo el {biggestDrop.pct}% de quienes llegan a este bloque
            continúan.
          </p>
        </div>
      )}
    </div>
  )
}
