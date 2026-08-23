import { TrendingDown } from "lucide-react"

import { formatNumero } from "@/lib/format"
import { cn } from "@/lib/utils"

import { encontrarMayorCaida } from "./analitica-metrics"
import type { RunResumen } from "./analytics-queries"
import type { WorkflowWithGraph } from "./queries"

/**
 * "Caída por nodo" (Figma 08.3, 681:2133): sidebar compacto, sin barras
 * anchas — a diferencia del mockup, que muestra un único camino "principal"
 * a través del journey (omite la rama de push para solo seguir la de
 * email), esta lista muestra TODOS los nodo·puerto de la corrida — elegir
 * cuál rama es "la principal" es un juicio editorial que no se puede
 * calcular de forma objetiva a partir de los conteos, y mostrar de menos
 * sería menos honesto que mostrar de más. Comparte el cálculo de "mayor
 * caída" con `AnaliticaCanvas` (`encontrarMayorCaida`) para que ambos
 * señalen siempre el mismo hallazgo.
 */
export function AnaliticaFunnel({
  corrida,
  edges,
}: {
  corrida: RunResumen
  edges: WorkflowWithGraph["edges"]
}) {
  const filas = corrida.pasos.map((p) => ({
    key: `${p.nodeId}-${p.port ?? "fin"}`,
    nodeId: p.nodeId,
    etiqueta: p.etiqueta,
    port: p.port,
    // Puerto `null` = nodo terminal — `simularWorkflow` no le calcula un
    // `conteo_salida` real (no hay a dónde salir), así que se muestra su
    // `conteoEntrada` (los que SÍ llegaron) en su lugar.
    conteo: p.port === null ? p.conteoEntrada : p.conteoSalida,
    pct: p.conteoEntrada
      ? Math.round(
          ((p.port === null ? p.conteoEntrada : p.conteoSalida) /
            p.conteoEntrada) *
            100
        )
      : 0,
  }))

  const mayorCaida = encontrarMayorCaida(corrida.pasos, edges)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-foreground">
          Caída por nodo
        </p>
        {filas.map((f) => {
          const esMayorCaida =
            mayorCaida?.nodeId === f.nodeId && mayorCaida.port === f.port
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <p className="min-w-0 truncate text-foreground">
                  {f.etiqueta}
                  {f.port && (
                    <span className="text-muted-foreground"> · {f.port}</span>
                  )}
                </p>
                <p className="shrink-0 text-foreground">
                  {formatNumero(f.conteo)}{" "}
                  <span className="text-muted-foreground">({f.pct}%)</span>
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    esMayorCaida
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

      {mayorCaida && mayorCaida.pct < 100 && (
        <div className="flex items-start gap-2.5 rounded-xl bg-warning-bg px-3.5 py-3">
          <TrendingDown className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-[12px] leading-[17px] text-foreground">
            <span className="font-semibold">
              Mayor caída: {mayorCaida.etiqueta} · {mayorCaida.port}
            </span>{" "}
            — solo el {mayorCaida.pct}% de quienes llegan a este bloque
            continúan.
          </p>
        </div>
      )}
    </div>
  )
}
