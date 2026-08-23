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

import { SALES_CHANNEL_LABEL } from "../lib/labels"
import type { PurchaseBehavior } from "../lib/queries"

function DataPoint({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  detail: ReactNode
}) {
  return (
    <div className="flex flex-1 items-center gap-2.5 px-4 first:pl-0 last:pr-0">
      <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-accent">
        <Icon className="size-3.5 text-accent-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] text-muted-foreground">{label}</p>
        <p className="truncate text-[13px] font-semibold text-foreground">
          {value}
        </p>
        <p className="truncate text-[9px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

type MemberPurchaseBehaviorProps = { behavior: PurchaseBehavior }

/** Figma "Card · Comportamiento de compra" (1138:4665) pixel-perfect, real: agregado de `pedidos`/`pedido_items`. */
export function MemberPurchaseBehavior({
  behavior,
}: MemberPurchaseBehaviorProps) {
  if (behavior.totalOrders === 0) {
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
      <DataPoint
        icon={Store}
        label="Tienda habitual"
        value={behavior.usualStore?.name ?? "—"}
        detail={
          behavior.usualStore
            ? `${formatPercent(behavior.usualStore.percentage)} de compras`
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <DataPoint
        icon={Smartphone}
        label="Canal preferido"
        value={
          behavior.preferredChannel
            ? (SALES_CHANNEL_LABEL[
                behavior.preferredChannel
                  .channel as keyof typeof SALES_CHANNEL_LABEL
              ] ?? behavior.preferredChannel.channel)
            : "—"
        }
        detail={
          behavior.preferredChannel
            ? `${formatPercent(behavior.preferredChannel.percentage)} de pedidos`
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <DataPoint
        icon={Repeat}
        label="Frecuencia"
        value={
          behavior.monthlyFrequency
            ? `${behavior.monthlyFrequency.toFixed(1)} / mes`
            : "—"
        }
        detail={
          behavior.intervalDays
            ? `intervalo ${behavior.intervalDays} días`
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <DataPoint
        icon={Receipt}
        label="Ticket promedio"
        value={formatCOP(behavior.averageTicket)}
        detail={
          behavior.ticketTrend !== null ? (
            <span
              className={cn(
                behavior.ticketTrend >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {formatDeltaPercent(behavior.ticketTrend)} vs. semestre anterior
            </span>
          ) : (
            "—"
          )
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <DataPoint
        icon={Tag}
        label="Categoría dominante"
        value={behavior.dominantCategory?.name ?? "—"}
        detail={
          behavior.dominantCategory
            ? `${formatPercent(behavior.dominantCategory.percentage)} del gasto`
            : "—"
        }
      />
      <div className="w-px shrink-0 bg-muted" />
      <DataPoint
        icon={Clock}
        label="Última compra"
        value={
          behavior.lastPurchase
            ? formatRelativeTime(behavior.lastPurchase)
            : "—"
        }
        detail={behavior.lastPurchase ? formatDate(behavior.lastPurchase) : "—"}
      />
      <div className="w-px shrink-0 bg-muted" />
      <DataPoint
        icon={CalendarClock}
        label="Próxima estimada"
        value={
          behavior.nextEstimated ? formatDate(behavior.nextEstimated) : "—"
        }
        detail={`${formatNumber(behavior.totalOrders)} pedidos en total`}
      />
    </div>
  )
}
