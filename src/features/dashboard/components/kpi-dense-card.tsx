import {
  Receipt,
  Repeat,
  Target,
  TicketPercent,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Sparkline } from "@/components/data/sparkline"
import { formatDeltaPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  "user-plus": UserPlus,
  repeat: Repeat,
  receipt: Receipt,
  "ticket-percent": TicketPercent,
  target: Target,
}

type KpiDenseCardProps = {
  label: string
  icon: keyof typeof ICONS
  value: string
  /** Ausente cuando no hay periodo de comparación con datos — la pill se muestra neutral. */
  deltaPct?: number
  deltaLabel?: string
  caption: string
  sparkline?: number[]
  tone: "cliente" | "promo" | "white"
}

const TONE_BG: Record<KpiDenseCardProps["tone"], string> = {
  cliente: "bg-brand-subtle",
  promo: "bg-promo-subtle",
  white: "bg-background",
}

/** Figma "KPI · Clientes activos" y análogas (646:1489…646:1524): icono + label, valor con pill de variación en línea, sub-fila con caption y sparkline. */
export function KpiDenseCard({
  label,
  icon,
  value,
  deltaPct,
  deltaLabel,
  caption,
  sparkline,
  tone,
}: KpiDenseCardProps) {
  const Icon = ICONS[icon]
  const hasDelta = deltaPct !== undefined
  const isNegative = hasDelta && deltaPct < 0
  const delta = hasDelta
    ? (deltaLabel ?? formatDeltaPercent(deltaPct / 100))
    : "—"

  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-1 rounded-[20px] px-3.5 py-[11px] shadow-form-section",
        TONE_BG[tone]
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-[13px] text-muted-foreground" />
        <p className="text-[11px] leading-[14px] font-medium text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="flex-1 text-[22px] leading-7 font-semibold text-foreground">
          {value}
        </p>
        <span
          className={cn(
            "rounded-full px-[7px] py-0.5 text-[10px] leading-[14px] font-semibold whitespace-nowrap",
            !hasDelta
              ? "bg-muted text-muted-foreground"
              : isNegative
                ? "bg-destructive-bg text-destructive"
                : "bg-success-bg text-success"
          )}
        >
          {delta}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <p
          className="flex-1 truncate text-[10px] leading-[14px] text-muted-foreground"
          title={caption}
        >
          {caption}
        </p>
        <Sparkline values={sparkline ?? []} className="h-5 w-10 shrink-0" />
      </div>
    </div>
  )
}
