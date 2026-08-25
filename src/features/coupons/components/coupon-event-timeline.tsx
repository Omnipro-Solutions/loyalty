import { formatEventDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { COUPON_ACTOR_TYPE_LABEL, COUPON_EVENT_TYPE_DOT } from "../lib/labels"
import type { CouponEvent } from "../lib/queries"
import type { CouponActorType } from "@/types/domain"

function actorLine(event: CouponEvent): string {
  const actorType = event.actor_type as CouponActorType
  if (actorType === "system") return event.actor_label
  return `${event.actor_label} · ${COUPON_ACTOR_TYPE_LABEL[actorType].toLowerCase()}`
}

type CouponEventTimelineProps = { events: CouponEvent[] }

/** Figma 13.4 "Log de eventos" — orden cronológico ascendente, línea append-only. */
export function CouponEventTimeline({ events }: CouponEventTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        Todavía no hay eventos registrados.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                COUPON_EVENT_TYPE_DOT[
                  event.type as keyof typeof COUPON_EVENT_TYPE_DOT
                ]
              )}
            />
            {index < events.length - 1 && (
              <span className="w-px flex-1 bg-border" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pb-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-foreground">
                  {event.title}
                </p>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {event.type}
                </span>
              </div>
              {event.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.detail}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {actorLine(event)}
              </p>
            </div>
            <p className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
              {formatEventDate(event.occurred_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
