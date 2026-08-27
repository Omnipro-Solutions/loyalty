"use client"

import { Braces, ChevronDown, History, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatEventDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PROMOTION_EVENT_TYPES } from "@/types/domain"

import {
  PROMOTION_EVENT_BADGE_VARIANT,
  PROMOTION_EVENT_ICON,
} from "../lib/event-icon"
import { CHANNEL_SCOPE_LABEL, PROMOTION_EVENT_TYPE_LABEL } from "../lib/labels"
import type { PromotionEventItem } from "../lib/queries"

const FILTERS = ["todos", ...PROMOTION_EVENT_TYPES] as const
type Filter = (typeof FILTERS)[number]

const GRID =
  "grid-cols-[136px_190px_minmax(0,1fr)_92px_128px_minmax(0,1fr)_28px]"

function EventRow({
  event,
  open,
  onToggle,
}: {
  event: PromotionEventItem
  open: boolean
  onToggle: () => void
}) {
  const metadataEntries = Object.entries(event.metadatos)
  const hasExpandable = metadataEntries.length > 0 || !!event.notaMotivo
  const EventIcon = PROMOTION_EVENT_ICON[event.tipo]

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        role={hasExpandable ? "button" : undefined}
        onClick={hasExpandable ? onToggle : undefined}
        className={cn(
          "grid items-center gap-2.5 px-5 py-3 text-xs transition-colors",
          GRID,
          hasExpandable && "cursor-pointer hover:bg-muted/60",
          open && "bg-muted/40"
        )}
      >
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatEventDate(event.ocurridoEn)}
        </span>
        <Badge
          variant={PROMOTION_EVENT_BADGE_VARIANT[event.tipo]}
          className="w-fit shrink-0"
        >
          <EventIcon data-icon="inline-start" />
          {PROMOTION_EVENT_TYPE_LABEL[event.tipo]}
        </Badge>
        <span className="min-w-0 truncate font-medium text-foreground">
          {event.promocionNombre}
        </span>
        <span className="truncate text-secondary-foreground">
          {event.canal ? CHANNEL_SCOPE_LABEL[event.canal] : "—"}
        </span>
        <span className="truncate text-secondary-foreground">
          {event.actorEtiqueta}
        </span>
        <span className="min-w-0 truncate text-muted-foreground">
          {event.notaMotivo ?? event.detalle ?? "—"}
        </span>
        {hasExpandable ? (
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        ) : (
          <span />
        )}
      </div>
      {open && hasExpandable && (
        <div className="border-t border-border bg-muted/50 px-5 py-4">
          <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            <Braces className="size-3" />
            Datos del evento
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-3">
            {[
              ...metadataEntries,
              ...(event.notaMotivo
                ? ([["nota_motivo", event.notaMotivo]] as const)
                : []),
              ...(event.codigoMotivo
                ? ([["codigo_motivo", event.codigoMotivo]] as const)
                : []),
            ].map(([key, value]) => (
              <div key={key} className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10px] font-medium tracking-[0.02em] text-muted-foreground">
                  {key}
                </span>
                <span
                  className="truncate font-mono text-[11px] text-foreground"
                  title={String(value)}
                >
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type PromotionEventsLogProps = { events: PromotionEventItem[] }

/**
 * Tabla filtrable de eventos, adaptada de "Logs de compras e interacciones"
 * (Analítica de Loyalty.dc.html) — misma idea de fila expandible con datos
 * internos, pero con columnas y payload reales de `promocion_eventos` (sin
 * Cliente/Monto/Puntos/Lat., que no existen aquí, y sin la barra de "consulta
 * ejecutada" ni la traza de evaluación — implican un motor de reglas y una
 * capa de warehouse/caché que no existen en este proyecto).
 */
export function PromotionEventsLog({ events }: PromotionEventsLogProps) {
  const [filter, setFilter] = useState<Filter>("todos")
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((e) => {
      if (filter !== "todos" && e.tipo !== filter) return false
      if (!q) return true
      return (
        e.promocionNombre.toLowerCase().includes(q) ||
        e.titulo.toLowerCase().includes(q) ||
        e.actorEtiqueta.toLowerCase().includes(q)
      )
    })
  }, [events, filter, search])

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-[10px] border border-border bg-background px-3 py-2 transition-colors focus-within:border-ring">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por promoción, título o actor…"
            className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        {FILTERS.map((f) => {
          const active = filter === f
          const count =
            f === "todos"
              ? events.length
              : events.filter((e) => e.tipo === f).length
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "flex h-9 items-center rounded-full px-3.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-secondary-foreground hover:bg-muted"
              )}
            >
              {f === "todos" ? "Todos" : PROMOTION_EVENT_TYPE_LABEL[f]} ({count}
              )
            </button>
          )
        })}
      </div>

      <div className="w-full overflow-x-auto rounded-[20px] bg-background shadow-form-section">
        <div className="min-w-[960px]">
          <div
            className={cn(
              "grid gap-2.5 border-b border-border bg-muted px-5 py-2 text-[10px] font-semibold tracking-[0.04em] text-secondary-foreground uppercase",
              GRID
            )}
          >
            <span>Timestamp</span>
            <span>Evento</span>
            <span>Promoción</span>
            <span>Canal</span>
            <span>Actor</span>
            <span>Detalle</span>
            <span />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sin eventos"
              description="Ningún evento coincide con el filtro o la búsqueda actual."
              className="pb-8"
            />
          ) : (
            filtered.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                open={openId === event.id}
                onToggle={() =>
                  setOpenId((current) =>
                    current === event.id ? null : event.id
                  )
                }
              />
            ))
          )}

          <div className="flex items-center border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {filtered.length} de {events.length} eventos
          </div>
        </div>
      </div>
    </div>
  )
}
