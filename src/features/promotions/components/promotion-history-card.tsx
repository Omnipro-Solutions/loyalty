"use client"

import { ChevronDown, History } from "lucide-react"
import { useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatEventDate, formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

import {
  PROMOTION_EVENT_BADGE_VARIANT,
  PROMOTION_EVENT_ICON,
} from "../lib/event-icon"
import {
  PROMOTION_EVENT_TYPE_LABEL,
  PROMOTION_STATUS_CHANGE_REASON_LABEL,
} from "../lib/labels"
import type { PromotionEventItem } from "../lib/queries"
import type { PromotionStatusChangeReason } from "@/types/domain"

/** El `codigo_motivo` de los eventos sembrados no tiene por qué ser uno de los códigos actuales — se muestra crudo antes que romper. */
function reasonLabel(code: string): string {
  return (
    PROMOTION_STATUS_CHANGE_REASON_LABEL[code as PromotionStatusChangeReason] ??
    code
  )
}

function HistoryEntry({
  event,
  isLast,
}: {
  event: PromotionEventItem
  isLast: boolean
}) {
  const [open, setOpen] = useState(false)
  const Icon = PROMOTION_EVENT_ICON[event.tipo]
  const metadataEntries = Object.entries(event.metadatos)
  const hasDetail = metadataEntries.length > 0 || !!event.detalle

  return (
    <div className="flex items-stretch gap-3">
      {/* Riel del timeline — el ícono ancla el evento y la línea encadena el orden. */}
      <div className="flex flex-col items-center">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>

      <div
        className={cn("flex min-w-0 flex-1 flex-col gap-1", !isLast && "pb-4")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={PROMOTION_EVENT_BADGE_VARIANT[event.tipo]}>
            {PROMOTION_EVENT_TYPE_LABEL[event.tipo]}
          </Badge>
          <span className="text-xs font-medium text-foreground">
            {event.titulo}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 text-muted-foreground">
          {/* Instante exacto + tiempo relativo: uno para auditar, otro para ubicarse de un vistazo. */}
          <span className="font-mono">{formatEventDate(event.ocurridoEn)}</span>
          <span aria-hidden>·</span>
          <span>{formatRelativeTime(event.ocurridoEn)}</span>
          <span aria-hidden>·</span>
          <span className="text-secondary-foreground">
            {event.actorEtiqueta}
          </span>
          {event.canal && (
            <>
              <span aria-hidden>·</span>
              <span>{event.canal}</span>
            </>
          )}
        </div>

        {event.codigoMotivo && (
          <p className="text-[11px] leading-4 text-secondary-foreground">
            <span className="font-medium text-foreground">Motivo:</span>{" "}
            {reasonLabel(event.codigoMotivo)}
            {event.notaMotivo ? ` — ${event.notaMotivo}` : ""}
          </p>
        )}

        {hasDetail && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-fit items-center gap-1 text-[11px] font-medium text-primary"
          >
            {open ? "Ocultar datos" : "Ver datos del evento"}
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        )}

        {open && hasDetail && (
          <div className="mt-0.5 flex flex-col gap-1.5 rounded-lg bg-muted px-2.5 py-2 font-mono text-[10px] leading-4 text-secondary-foreground">
            {event.detalle && (
              <p className="text-foreground">{event.detalle}</p>
            )}
            {/* Clave sobre valor, no en dos columnas: en el panel de 330px una columna fija de claves dejaba los valores en 3 caracteres por línea. */}
            {metadataEntries.map(([key, value]) => (
              <div key={key} className="flex min-w-0 flex-col">
                <span className="text-muted-foreground">{key}</span>
                <span className="min-w-0 break-all text-foreground">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type PromotionHistoryCardProps = { events: PromotionEventItem[] }

/**
 * "Historial" de una promoción ya creada: quién la creó, cuándo, y cada
 * cambio de estado con su motivo. Es la misma tabla `promocion_eventos` que
 * alimenta los Logs del panel, pero de una sola promoción y como línea de
 * tiempo (más antiguo arriba) en vez de tabla filtrable.
 */
export function PromotionHistoryCard({ events }: PromotionHistoryCardProps) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[20px] bg-background px-[18px] py-4 shadow-form-section">
      <div className="flex flex-col gap-[3px]">
        <div className="flex items-center gap-2">
          <History className="size-4 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-sm font-semibold text-foreground">
            Historial
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {events.length} evento{events.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          Quién la creó, cuándo, y cada cambio con su motivo.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={History}
          title="Sin eventos"
          description="Todavía no hay nada registrado para esta promoción."
        />
      ) : (
        <div className="flex flex-col">
          {events.map((event, index) => (
            <HistoryEntry
              key={event.id}
              event={event}
              isLast={index === events.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
