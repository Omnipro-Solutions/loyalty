"use client"

import { ChevronDown, History, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatEventDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PROMOTION_EVENT_TYPES, type PromotionEventType } from "@/types/domain"

import { CHANNEL_SCOPE_LABEL, PROMOTION_EVENT_TYPE_LABEL } from "../lib/labels"
import type { PromotionEventItem } from "../lib/queries"

const EVENT_BADGE_VARIANT: Record<
  PromotionEventType,
  "neutral" | "success" | "warning" | "error" | "info"
> = {
  creada: "neutral",
  activada: "success",
  pausada: "warning",
  presupuesto_incrementado: "info",
  presupuesto_agotado: "warning",
  vencida: "neutral",
  cancelada: "neutral",
  canje: "success",
  canje_rechazado: "error",
}

const FILTERS = ["todos", ...PROMOTION_EVENT_TYPES] as const
type Filter = (typeof FILTERS)[number]

const GRID =
  "grid-cols-[132px_130px_minmax(0,1fr)_90px_130px_minmax(0,1fr)_28px]"

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

  return (
    <div className="border-b border-border">
      <div
        role={hasExpandable ? "button" : undefined}
        onClick={hasExpandable ? onToggle : undefined}
        className={cn(
          "grid items-center gap-2.5 px-5 py-2.5 text-xs",
          GRID,
          hasExpandable && "cursor-pointer hover:bg-muted/60"
        )}
      >
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatEventDate(event.ocurridoEn)}
        </span>
        <Badge
          variant={EVENT_BADGE_VARIANT[event.tipo]}
          className="w-fit shrink-0"
        >
          {PROMOTION_EVENT_TYPE_LABEL[event.tipo]}
        </Badge>
        <span className="min-w-0 truncate font-medium text-foreground">
          {event.promocionNombre}
        </span>
        <span className="text-secondary-foreground">
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
        <div className="flex flex-col gap-3 bg-neutral-500 px-5 py-4 font-mono text-xs text-neutral-100">
          <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.06em] text-neutral-400 uppercase">
            Datos del evento
          </div>
          <div className="flex flex-col">
            {[
              ...metadataEntries,
              ...(event.notaMotivo
                ? ([["nota_motivo", event.notaMotivo]] as const)
                : []),
              ...(event.codigoMotivo
                ? ([["codigo_motivo", event.codigoMotivo]] as const)
                : []),
            ].map(([key, value]) => (
              <div
                key={key}
                className="flex items-baseline gap-4 border-b border-white/10 py-1.5"
              >
                <span className="w-44 shrink-0 text-neutral-400">{key}</span>
                <span className="text-neutral-50">{String(value)}</span>
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
        <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-[10px] border border-border bg-background px-3 py-2">
          <Search className="size-3.5 text-muted-foreground" />
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
                "flex h-9 items-center rounded-full px-3.5 text-xs font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-secondary-foreground"
              )}
            >
              {f === "todos" ? "Todos" : PROMOTION_EVENT_TYPE_LABEL[f]} ({count}
              )
            </button>
          )
        })}
      </div>

      <div className="w-full overflow-x-auto rounded-[20px] bg-background shadow-form-section">
        <div className="min-w-[900px]">
          <div
            className={cn(
              "grid gap-2.5 bg-muted px-5 py-2 text-[10px] font-semibold tracking-[0.04em] text-secondary-foreground uppercase",
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

          <div className="flex items-center px-5 py-3 text-xs text-muted-foreground">
            {filtered.length} de {events.length} eventos
          </div>
        </div>
      </div>
    </div>
  )
}
