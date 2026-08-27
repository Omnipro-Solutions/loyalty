import { formatNumber } from "@/lib/format"

import type { GiftedUnitsByProduct } from "../lib/queries"

type PromotionsGiftedUnitsProps = { items: GiftedUnitsByProduct[] }

/**
 * Sin nodo Figma — nueva a pedido del usuario (Fase 2). Unidades regaladas
 * por producto (`producto_gratis`/`por_piezas`) — a diferencia del ROI/
 * costo por canje, que no responde nada útil para esta familia de
 * mecánica, esto sí: cuánto se regaló y de qué.
 */
export function PromotionsGiftedUnits({ items }: PromotionsGiftedUnitsProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">
          Unidades regaladas
        </p>
        <p className="text-xs text-muted-foreground">
          Producto más redimido en promociones de piezas gratis
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción filtrada entrega piezas físicas con canjes reales.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate text-foreground">
                {item.productName}
              </span>
              <span className="shrink-0 font-medium text-foreground">
                {formatNumber(item.unidades)} un.
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
