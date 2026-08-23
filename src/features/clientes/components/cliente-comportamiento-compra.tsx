import {
  CalendarClock,
  Clock,
  type LucideIcon,
  Receipt,
  Repeat,
  Smartphone,
  Store,
  Tag,
} from "lucide-react"
import type { ReactNode } from "react"

import { PlaceholderCard } from "@/components/feedback/placeholder-card"
import {
  formatCOP,
  formatDeltaPercent,
  formatDate,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format"
import { cn } from "@/lib/utils"

import { CANAL_VENTA_LABEL } from "../lib/labels"
import type { ComportamientoCompra } from "../lib/queries"

function Dato({
  icon: Icon,
  etiqueta,
  valor,
  detalle,
}: {
  icon: LucideIcon
  etiqueta: string
  valor: ReactNode
  detalle: ReactNode
}) {
  return (
    <div className="flex flex-1 items-center gap-2.5 px-4 first:pl-0 last:pr-0">
      <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent">
        <Icon className="size-3.5 text-accent-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] text-muted-foreground">{etiqueta}</p>
        <p className="truncate text-[13px] font-semibold text-foreground">
          {valor}
        </p>
        <p className="truncate text-[9px] text-muted-foreground">{detalle}</p>
      </div>
    </div>
  )
}

type ClienteComportamientoCompraProps = { comportamiento: ComportamientoCompra }

/** Figma "Card · Comportamiento de compra" (1138:4665) pixel-perfect, real: agregado de `pedidos`/`pedido_items`. */
export function ClienteComportamientoCompra({
  comportamiento,
}: ClienteComportamientoCompraProps) {
  if (comportamiento.totalPedidos === 0) {
    return (
      <PlaceholderCard
        icon={Receipt}
        title="Sin pedidos todavía"
        description="Este socio no tiene compras registradas."
        compact
        className="w-full rounded-[20px] px-5 py-4"
      />
    )
  }

  return (
    <div className="flex w-full items-stretch rounded-[20px] bg-background px-5 py-3.5 shadow-form-section">
      <Dato
        icon={Store}
        etiqueta="Tienda habitual"
        valor={comportamiento.tiendaHabitual?.nombre ?? "—"}
        detalle={
          comportamiento.tiendaHabitual
            ? `${formatPercent(comportamiento.tiendaHabitual.porcentaje)} de compras`
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <Dato
        icon={Smartphone}
        etiqueta="Canal preferido"
        valor={
          comportamiento.canalPreferido
            ? (CANAL_VENTA_LABEL[
                comportamiento.canalPreferido
                  .canal as keyof typeof CANAL_VENTA_LABEL
              ] ?? comportamiento.canalPreferido.canal)
            : "—"
        }
        detalle={
          comportamiento.canalPreferido
            ? `${formatPercent(comportamiento.canalPreferido.porcentaje)} de pedidos`
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <Dato
        icon={Repeat}
        etiqueta="Frecuencia"
        valor={
          comportamiento.frecuenciaMensual
            ? `${comportamiento.frecuenciaMensual.toFixed(1)} / mes`
            : "—"
        }
        detalle={
          comportamiento.intervaloDias
            ? `intervalo ${comportamiento.intervaloDias} días`
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <Dato
        icon={Receipt}
        etiqueta="Ticket promedio"
        valor={formatCOP(comportamiento.ticketPromedio)}
        detalle={
          comportamiento.tendenciaTicket !== null ? (
            <span
              className={cn(
                comportamiento.tendenciaTicket >= 0
                  ? "text-success"
                  : "text-destructive"
              )}
            >
              {formatDeltaPercent(comportamiento.tendenciaTicket)} vs. semestre
              anterior
            </span>
          ) : (
            "—"
          )
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <Dato
        icon={Tag}
        etiqueta="Categoría dominante"
        valor={comportamiento.categoriaDominante?.nombre ?? "—"}
        detalle={
          comportamiento.categoriaDominante
            ? `${formatPercent(comportamiento.categoriaDominante.porcentaje)} del gasto`
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <Dato
        icon={Clock}
        etiqueta="Última compra"
        valor={
          comportamiento.ultimaCompra
            ? formatRelativeTime(comportamiento.ultimaCompra)
            : "—"
        }
        detalle={
          comportamiento.ultimaCompra
            ? formatDate(comportamiento.ultimaCompra)
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <Dato
        icon={CalendarClock}
        etiqueta="Próxima estimada"
        valor={
          comportamiento.proximaEstimada
            ? formatDate(comportamiento.proximaEstimada)
            : "—"
        }
        detalle={`${formatNumber(comportamiento.totalPedidos)} pedidos en total`}
      />
    </div>
  )
}
