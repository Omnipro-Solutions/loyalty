"use client"

import { History } from "lucide-react"
import { useState } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatUSD, formatDeltaPercent, formatEventDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  PRODUCT_EVENT_CATEGORIES,
  type ProductEventCategory,
} from "@/types/domain"

import type { ProductEvent } from "../lib/queries"

const FIELD_LABEL: Record<string, string> = {
  proveedor: "Proveedor",
  marca: "Marca",
  presentacion: "Presentación",
  tipo_producto: "Tipo de producto",
  codigo_barras: "Código de barras",
  nombre: "Nombre",
}

const STATUS_LABEL: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
}

function fileName(url: string): string {
  return url.split("/").pop() ?? url
}

/** Reconstruye el texto "valor anterior → valor nuevo" del Figma a partir de las columnas reales del evento — cada rama es un caso genuino de `productos_registrar_eventos()`. */
function eventDetail(event: ProductEvent): string | null {
  const { categoria, campo, valor_anterior, valor_nuevo, descripcion } = event

  if (categoria === "estado") {
    const previous = STATUS_LABEL[valor_anterior ?? ""] ?? valor_anterior ?? "—"
    const next = STATUS_LABEL[valor_nuevo ?? ""] ?? valor_nuevo ?? "—"
    return `${previous} → ${next}`
  }

  if (categoria === "precio" && valor_anterior && valor_nuevo) {
    const previous = Number(valor_anterior)
    const next = Number(valor_nuevo)
    const change = previous !== 0 ? (next - previous) / previous : 0
    const prefix = descripcion ? `${descripcion}  ·  ` : ""
    const percentage = formatDeltaPercent(change).replace("%", " %")
    return `${prefix}${formatUSD(previous)} → ${formatUSD(next)}  (${percentage})`
  }

  if (campo === "imagen_url" && valor_nuevo) {
    return `Imagen actualizada: ${fileName(valor_nuevo)}`
  }

  if (campo && campo in FIELD_LABEL) {
    const label = FIELD_LABEL[campo]
    return valor_anterior !== null
      ? `${label}: “${valor_anterior}” → “${valor_nuevo}”`
      : `${label} asignado: “${valor_nuevo}”`
  }

  if (valor_anterior !== null || valor_nuevo !== null) {
    return `${valor_anterior ?? "—"} → ${valor_nuevo ?? "—"}`
  }

  return descripcion
}

const CATEGORY_LABEL: Record<ProductEventCategory, string> = {
  precio: "Precios",
  datos: "Datos del producto",
  promocion: "Promociones",
  estado: "Estado",
}

const CATEGORY_TAG_LABEL: Record<ProductEventCategory, string> = {
  precio: "PRECIO",
  datos: "DATOS",
  promocion: "PROMOCIÓN",
  estado: "ESTADO",
}

/** Variante del `Badge` compartido por categoría — verificada contra `get_variable_defs` del nodo 1218:4026: precio=info (primary/50-700), datos=neutral (bg/subtle+text/secondary), promoción=success, estado=warning. */
const CATEGORY_BADGE_VARIANT: Record<
  ProductEventCategory,
  "info" | "neutral" | "success" | "warning"
> = {
  precio: "info",
  datos: "neutral",
  promocion: "success",
  estado: "warning",
}

/** Color del punto del riel — verificado exportando los 5 SVG "Rail" del nodo (data/indigo, data/coral, data/teal, data/amber, data/violet). No sigue 1:1 la categoría: "Imagen actualizada" es violeta aunque su tag sea DATOS. */
const CATEGORY_DOT_CLASS: Record<ProductEventCategory, string> = {
  precio: "bg-data-indigo",
  datos: "bg-data-teal",
  promocion: "bg-data-coral",
  estado: "bg-data-amber",
}

const FILTERS = ["todos", ...PRODUCT_EVENT_CATEGORIES] as const
type Filter = (typeof FILTERS)[number]

const PAGE_SIZE = 8

function dotColor(event: ProductEvent): string {
  if (event.campo === "imagen_url") return "bg-data-violet"
  return CATEGORY_DOT_CLASS[event.categoria as ProductEventCategory]
}

function EventRow({
  event,
  isFirst,
  isLast,
}: {
  event: ProductEvent
  isFirst: boolean
  isLast: boolean
}) {
  const category = event.categoria as ProductEventCategory
  const detail = eventDetail(event)

  return (
    <div className="flex gap-3.5 py-3.5">
      <p className="w-[140px] shrink-0 font-mono text-[11px] leading-4 text-muted-foreground">
        {formatEventDate(event.creado_en)}
      </p>
      <div className="relative flex w-3 shrink-0 flex-col items-center">
        {!isFirst && (
          <div className="absolute top-0 h-1/2 w-[1.5px] bg-border" />
        )}
        {!isLast && (
          <div className="absolute bottom-0 h-1/2 w-[1.5px] bg-border" />
        )}
        <div
          className={cn(
            "z-10 mt-[3px] size-3 shrink-0 rounded-full ring-[3px] ring-background",
            dotColor(event)
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] leading-[18px] font-semibold text-foreground">
            {event.titulo}
          </p>
          <Badge
            variant={CATEGORY_BADGE_VARIANT[category]}
            className="h-auto shrink-0 rounded-[6px] px-[7px] py-0.5 text-[9px] leading-[13px] font-semibold tracking-[0.3px]"
          >
            {CATEGORY_TAG_LABEL[category]}
          </Badge>
        </div>
        {detail && (
          <p className="text-[12px] leading-[17px] text-muted-foreground">
            {detail}
          </p>
        )}
        <p className="text-[11px] leading-[15px] text-muted-foreground">
          {event.autor_nombre}
          {event.es_automatico && " · automático"}
        </p>
      </div>
    </div>
  )
}

type ProductHistoryCardProps = { events: ProductEvent[] }

/** Figma "Card · Bitácora de cambios" (1218:4026), "03.3 · Catálogo · detalle de producto · v2" — generada por triggers reales, ver 20260823160000_bitacora_producto.sql. */
export function ProductHistoryCard({ events }: ProductHistoryCardProps) {
  const [filter, setFilter] = useState<Filter>("todos")
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered =
    filter === "todos" ? events : events.filter((e) => e.categoria === filter)
  const shown = filtered.slice(0, visible)

  function selectFilter(next: Filter) {
    setFilter(next)
    setVisible(PAGE_SIZE)
  }

  return (
    <div className="w-full rounded-[20px] bg-background shadow-form-section">
      <div className="flex flex-col gap-3.5 px-[22px] pt-[18px] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[16px] leading-[23px] font-semibold text-foreground">
              Bitácora del producto
            </p>
            <p className="text-[11px] leading-[15px] text-muted-foreground">
              Todos los cambios de precio, datos, promociones y estado en un
              solo lugar
            </p>
          </div>
          <button
            type="button"
            disabled
            title="La exportación de la bitácora no está disponible en el ambiente de demo."
            className="shrink-0 cursor-not-allowed rounded-[10px] bg-muted px-4 py-2 text-xs font-medium text-muted-foreground"
          >
            Exportar bitácora
          </button>
        </div>

        {events.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f
              const count =
                f === "todos"
                  ? events.length
                  : events.filter((e) => e.categoria === f).length
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => selectFilter(f)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] leading-4",
                    active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "bg-muted font-medium text-muted-foreground"
                  )}
                >
                  {f === "todos" ? "Todos" : CATEGORY_LABEL[f]} ({count})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={History}
          title="Sin cambios registrados"
          description="Los cambios de precio, datos, promociones y estado de este producto aparecerán aquí a medida que ocurran."
          className="pt-0 pb-8"
        />
      ) : (
        <>
          <div className="flex flex-col divide-y divide-muted px-[22px] pt-1.5 pb-2.5">
            {shown.map((event, i) => (
              <EventRow
                key={event.id}
                event={event}
                isFirst={i === 0}
                isLast={i === shown.length - 1}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-b-[20px] bg-neutral-50 px-[22px] py-3.5 text-xs">
            <p className="flex-1 text-muted-foreground">
              Mostrando {shown.length} de {filtered.length} eventos
            </p>
            {visible < filtered.length && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="shrink-0 font-medium text-primary"
              >
                Cargar más eventos
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
