import { Badge } from "@/components/ui/badge"
import { formatNumber, formatPercent, formatUSD } from "@/lib/format"

import type { MechanicMetric } from "../lib/mechanic-kpis"
import type { PromotionMechanicResults } from "../lib/queries"

function formatMetric(metric: MechanicMetric): string {
  switch (metric.format) {
    case "money":
      return formatUSD(metric.value)
    case "percent":
      // `formatPercent` ya multiplica por 100 (Intl `style: "percent"`) y
      // `MechanicMetric.value` en formato `percent` es una fracción 0-1 —
      // multiplicar aquí otra vez mostraba 1.240 % donde iba 12,4 %.
      return formatPercent(metric.value)
    case "points":
      return `${formatNumber(Math.round(metric.value))} pts`
    case "number":
      return formatNumber(
        Number.isInteger(metric.value)
          ? metric.value
          : Number(metric.value.toFixed(2))
      )
  }
}

/**
 * El bloque que aparece cuando el panel está enfocado en UNA promoción.
 * Deliberadamente NO son los mismos números de arriba: canjes e inversión
 * comparan campañas entre sí, y esto contesta la otra pregunta —
 * ¿funcionó ESTA mecánica? Un cashback se juzga por su breakage y un 3x2
 * por sus piezas; el costo por canje no distingue entre los dos.
 */
export function PromotionsMechanicResults({
  results,
}: {
  results: PromotionMechanicResults
}) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">
            Resultados de la mecánica
          </p>
          <p className="text-xs text-muted-foreground">{results.nombre}</p>
        </div>
        <Badge variant="neutral">{results.mecanicaLabel}</Badge>
      </div>

      {results.metrics.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Esta promoción todavía no tiene canjes en la bitácora, así que no hay
          nada que medir de su mecánica.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {results.metrics.map((metric) => (
              <div key={metric.label} className="flex flex-col gap-0.5">
                <p className="text-[11px] text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-lg leading-6 font-semibold text-foreground">
                  {formatMetric(metric)}
                </p>
                {metric.hint && (
                  <p className="text-[11px] text-muted-foreground">
                    {metric.hint}
                  </p>
                )}
              </div>
            ))}
          </div>

          {results.breakdown && (
            <div className="flex flex-col gap-2 border-t border-border pt-3.5">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                {results.breakdown.label}
              </p>
              {results.breakdown.items.map((item) => (
                <div key={item.key} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-foreground">
                      {item.label}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatNumber(item.canjes)} · {formatPercent(item.share)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${item.share * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* La bitácora es una muestra de actividad reciente, no el ledger
          completo: no existe motor de checkout. Decir sobre cuántos canjes
          se calcularon los KPI es la diferencia entre un número que se
          puede defender y uno que no. */}
      <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
        Calculado sobre {formatNumber(results.sampleSize)} canjes con bitácora,
        de {formatNumber(results.canjesTotales)} registrados en la promoción.
        Inversión {formatUSD(results.inversion)} · venta asociada{" "}
        {formatUSD(results.ventaAsociada)}.
      </p>
    </div>
  )
}
