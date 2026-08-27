import { formatNumber } from "@/lib/format"

import type { PromotionCollisionSummaryItem } from "../lib/queries"

type PromotionsCollisionSummaryProps = {
  items: PromotionCollisionSummaryItem[]
}

/**
 * Sin nodo Figma — nueva a pedido del usuario. Reusa
 * `detectCollisions` (`lib/collision.ts`), el mismo cálculo que ya usa el
 * panel lateral del formulario al crear/editar, pero aplicado a TODAS las
 * promociones activas para ver el portafolio completo — comparación
 * estructural sobre canal + condiciones compartidas, no un motor de
 * evaluación de tráfico real.
 */
export function PromotionsCollisionSummary({
  items,
}: PromotionsCollisionSummaryProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">
          Posibles colisiones
        </p>
        <p className="text-xs text-muted-foreground">
          Promociones activas que comparten canal y condiciones
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción activa comparte canal y condiciones con otra.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-0.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-foreground">
                  {item.nombre}
                </span>
                <span className="shrink-0 font-medium text-warning">
                  {formatNumber(item.collisionCount)}{" "}
                  {item.collisionCount === 1 ? "colisión" : "colisiones"}
                </span>
              </div>
              <p className="truncate text-[10.5px] text-muted-foreground">
                {item.reasons.join(" · ")} · prioridad {item.priority}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
