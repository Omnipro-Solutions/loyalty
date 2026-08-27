import { formatNumber, formatUSD } from "@/lib/format"

import type { AverageCartByPromotion } from "../lib/queries"

type PromotionsAverageCartProps = { items: AverageCartByPromotion[] }

/**
 * Sin nodo Figma — nueva a pedido del usuario (Fase 2). Ticket promedio
 * real de los canjes con `monto_carrito` (envío gratis, cashback,
 * descuentos de carrito) — el ROI genérico no dice nada sobre el tamaño
 * del carrito que activó el beneficio; esto sí.
 */
export function PromotionsAverageCart({ items }: PromotionsAverageCartProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">Ticket promedio</p>
        <p className="text-xs text-muted-foreground">
          De las compras que activaron el beneficio
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción filtrada tiene monto de carrito real registrado.
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
                  {formatUSD(item.avgCartValue)}
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                sobre {formatNumber(item.sampleSize)} canjes con monto real
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
