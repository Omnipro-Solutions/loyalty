import { formatEventDate } from "@/lib/format"

import { PROMOTION_EVENT_ICON } from "../lib/event-icon"
import { PROMOTION_EVENT_TYPE_LABEL } from "../lib/labels"
import type { PromotionLifecycleEvent } from "../lib/queries"

type PromotionsLifecycleTimelineProps = { events: PromotionLifecycleEvent[] }

/**
 * Sin nodo Figma — nueva a pedido del usuario. Hitos de ciclo de vida
 * (`listPromotionLifecycleEvents`, sin `canje`/`canje_rechazado`: esos ya
 * tienen su propia tendencia semanal y KPI de tasa de rechazo) — responde
 * "¿qué pasó con las promociones filtradas?", no "cuántas veces se usaron".
 */
export function PromotionsLifecycleTimeline({
  events,
}: PromotionsLifecycleTimelineProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">Línea de tiempo</p>
        <p className="text-xs text-muted-foreground">
          Hitos recientes del ciclo de vida — sin canjes, ya tienen su propia
          tendencia
        </p>
      </div>
      {events.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Sin hitos de ciclo de vida en el período filtrado.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {events.map((event) => {
            const EventIcon = PROMOTION_EVENT_ICON[event.tipo]
            return (
              <div key={event.id} className="flex items-start gap-2.5 text-xs">
                <EventIcon className="mt-px size-[15px] shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate font-medium text-foreground">
                    {PROMOTION_EVENT_TYPE_LABEL[event.tipo]} ·{" "}
                    <span className="font-normal text-secondary-foreground">
                      {event.promocionNombre}
                    </span>
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {formatEventDate(event.ocurridoEn)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
