import { formatNumber } from "@/lib/format"

import type { PointsAwardedByPromotion } from "../lib/queries"

type PromotionsPointsAwardedProps = { items: PointsAwardedByPromotion[] }

/**
 * Sin nodo Figma — nueva a pedido del usuario (Fase 2). Puntos otorgados
 * reales (`multiplicador_puntos`/`bono_puntos`) — el ROI/costo por canje
 * en $ no aplica a esta familia; lo que importa es cuántos puntos se
 * emitieron y con qué promoción.
 */
export function PromotionsPointsAwarded({
  items,
}: PromotionsPointsAwardedProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">
          Puntos otorgados
        </p>
        <p className="text-xs text-muted-foreground">
          Emitidos por promociones de puntos
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción de puntos filtrada tiene canjes reales.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-0.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-foreground">
                  {item.nombre}
                </span>
                <span className="shrink-0 font-medium text-foreground">
                  {formatNumber(item.totalPoints)} pts
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                {formatNumber(item.sampleSize)} canjes ·{" "}
                {formatNumber(Math.round(item.totalPoints / item.sampleSize))}{" "}
                pts promedio
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
