import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import type { ExpiringPromotion } from "../lib/queries"

type PromotionsExpiringSoonProps = { promotions: ExpiringPromotion[] }

/**
 * Sin nodo Figma — nueva a pedido del usuario, para rellenar el espacio
 * sobrante de la barra lateral con una alerta operativa real: vigencia real
 * de `promociones.vigente_hasta` (ver `getPromotionsExpiringSoon`), no un
 * relleno decorativo.
 */
export function PromotionsExpiringSoon({
  promotions,
}: PromotionsExpiringSoonProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">
          Próximas a vencer
        </p>
        <p className="text-xs text-muted-foreground">
          Activas con vigencia en los próximos 7 días
        </p>
      </div>
      {promotions.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Ninguna promoción activa vence en los próximos 7 días.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {promotions.map((promotion) => (
            <div
              key={promotion.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate text-foreground">
                {promotion.nombre}
              </span>
              <span
                className={cn(
                  "shrink-0 font-medium",
                  promotion.diasRestantes === 0
                    ? "text-destructive"
                    : "text-warning"
                )}
              >
                {promotion.diasRestantes === 0
                  ? "Vence hoy"
                  : `${formatNumber(promotion.diasRestantes)} d.`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
