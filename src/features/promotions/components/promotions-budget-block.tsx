import { AlertTriangle, ChevronRight } from "lucide-react"
import Link from "next/link"

import { formatNumber, formatPercent, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { BudgetBlock, BudgetByPromotion } from "../lib/result-queries"

/**
 * Cuántas promociones se ven sin desplegar. Ocho, las mismas que la tabla de
 * desempeño con la que comparte fila: las dos tarjetas caen a la misma
 * altura y el desglose llena el hueco que dejaba el acumulado solo.
 */
const VISIBLE_PROMOTIONS = 8

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      {/* El acumulado dice si queda dinero; esto dice dónde se está yendo.
          Antes había que salir a otra pantalla para saberlo — y la tarjeta
          dejaba media columna en blanco al lado del ranking. */}
      {budget.porPromocion.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold text-foreground">
              Por promoción
            </p>
            {budget.sinTope > 0 && (
              // Las que no aparecen abajo, dichas: si no, la lista no cuadra
              // con el número de promociones del filtro.
              <p className="text-[10.5px] text-muted-foreground">
                {formatNumber(budget.sinTope)} sin tope
              </p>
            )}
          </div>

          {budget.porPromocion.slice(0, VISIBLE_PROMOTIONS).map((promo) => (
            <BudgetRow key={promo.id} promo={promo} />
          ))}

          {budget.porPromocion.length > VISIBLE_PROMOTIONS && (
            <details className="group">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-3 shrink-0 transition-transform group-open:rotate-90" />
                <span className="group-open:hidden">
                  Ver las{" "}
                  {formatNumber(
                    budget.porPromocion.length - VISIBLE_PROMOTIONS
                  )}{" "}
                  restantes
                </span>
                <span className="hidden group-open:inline">Ver menos</span>
              </summary>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {budget.porPromocion.slice(VISIBLE_PROMOTIONS).map((promo) => (
                  <BudgetRow key={promo.id} promo={promo} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/** Una promoción del desglose: cuánto lleva gastado de lo suyo. */
function BudgetRow({ promo }: { promo: BudgetByPromotion }) {
  const pct = Math.min(1, promo.consumedPct)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-[11px]">
        <Link
          href={`/promociones/${promo.id}`}
          className="min-w-0 truncate text-foreground hover:underline"
        >
          {promo.nombre}
        </Link>
        <span
          className={cn(
            "shrink-0 font-semibold tabular-nums",
            promo.overThreshold ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {formatPercent(promo.consumedPct)}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            promo.overThreshold ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {formatUSD(promo.consumed)} de {formatUSD(promo.assigned)}
      </p>
    </div>
  )
}
