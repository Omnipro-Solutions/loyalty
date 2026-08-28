import { AlertTriangle } from "lucide-react"

import { formatPercent, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { BudgetBlock } from "../lib/result-queries"

/**
 * "Presupuesto promocional" (spec §24) — asignado, consumido y disponible,
 * con la marca del umbral de alerta sobre la propia barra.
 *
 * Es un ACUMULADO, no una serie: `presupuesto_consumido` es un contador de
 * fila sin historia. Por eso vive aquí y no como tercera opción de la
 * gráfica de evolución (ver el comentario de `PromotionsResultTrend`).
 */
export function PromotionsBudgetBlock({ budget }: { budget: BudgetBlock }) {
  const pct = Math.min(1, budget.consumedPct)
  const overAlert =
    budget.alertPct !== null && budget.consumedPct >= budget.alertPct / 100

  return (
    <div className="flex h-full w-full flex-col gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] leading-[21px] font-semibold text-foreground">
          Presupuesto promocional
        </p>
        <p className="text-xs text-muted-foreground">
          Sobre las promociones del filtro
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Asignado", value: budget.assigned },
          { label: "Consumido", value: budget.consumed },
          { label: "Disponible", value: budget.available },
        ].map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="text-[15px] leading-[21px] font-semibold text-foreground">
              {formatUSD(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Utilización</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              overAlert ? "text-destructive" : "text-foreground"
            )}
          >
            {formatPercent(budget.consumedPct)}
          </span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full",
              overAlert ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${pct * 100}%` }}
          />
          {budget.alertPct !== null && (
            // La marca del umbral va SOBRE la barra: un "alerta al 80 %" en
            // texto aparte obliga a comparar dos números; aquí se ve si ya
            // se cruzó.
            <div
              className="absolute inset-y-0 w-0.5 bg-foreground/50"
              style={{ left: `${Math.min(100, budget.alertPct)}%` }}
              aria-hidden
            />
          )}
        </div>
        {budget.alertPct !== null && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {overAlert && (
              <AlertTriangle className="size-3 shrink-0 text-destructive" />
            )}
            Alerta al {budget.alertPct}%
            {budget.overThreshold > 0 &&
              ` · ${budget.overThreshold} promoción(es) ya lo cruzaron`}
          </p>
        )}
      </div>
    </div>
  )
}
