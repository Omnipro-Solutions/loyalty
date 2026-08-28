import { formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { BudgetPaceItem } from "../lib/queries"

type PromotionsBudgetPaceProps = { items: BudgetPaceItem[] }

/**
 * Sin nodo Figma — nueva a pedido del usuario. Ritmo de consumo proyectado
 * (`getPromotionsBudgetPace`): a diferencia de "En alerta" (que solo mira
 * el % consumido hoy), esto proyecta el gasto diario observado y avisa
 * cuándo el presupuesto se agotará antes de que termine la vigencia.
 */
export function PromotionsBudgetPace({ items }: PromotionsBudgetPaceProps) {
  return (
    <div className="flex h-full w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">
          Ritmo de consumo
        </p>
        <p className="text-xs text-muted-foreground">
          Proyección de agotamiento al ritmo diario observado
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción activa tiene consumo real que proyectar.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-foreground">
                  {item.nombre}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-medium",
                    item.seAgotaAntesDeVigencia
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {item.diasRestantesPresupuesto === 0
                    ? "Se agota hoy"
                    : `${formatNumber(item.diasRestantesPresupuesto)} d. de presupuesto`}
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                {formatPercent(item.consumedPct)} consumido
                {item.seAgotaAntesDeVigencia
                  ? " · se agota antes de que termine la vigencia"
                  : item.diasRestantesVigencia !== null
                    ? ` · vigencia termina en ${formatNumber(item.diasRestantesVigencia)} d.`
                    : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
