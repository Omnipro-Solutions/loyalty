import type { LucideIcon } from "lucide-react"

import { Sparkline } from "@/components/data/sparkline"
import { formatDeltaPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

export type KpiDenseTone = "cliente" | "promo" | "white"

const TONE_BG: Record<KpiDenseTone, string> = {
  cliente: "bg-card-tint",
  promo: "bg-promo-subtle",
  white: "bg-background",
}

/**
 * El trazo por defecto del sparkline es `stroke-primary` (violeta en claro),
 * buen contraste sobre blanco (6.01:1) pero se lava sobre `card-tint`
 * (5.15:1 — pasa AA pero se ve apagado, el tono de fondo y el trazo son la
 * misma familia). En oscuro `stroke-primary` es lima y ya contrasta de
 * sobra (12.6:1+) contra los fondos tintados — no tocar ahí.
 */
const TONE_STROKE: Record<KpiDenseTone, string> = {
  cliente: "stroke-accent-foreground dark:stroke-primary",
  promo: "stroke-accent-foreground dark:stroke-primary",
  white: "stroke-primary",
}

export type KpiDenseCardProps = {
  label: string
  icon: LucideIcon
  value: string
  /** Ausente cuando no hay periodo de comparación con datos — la pill se muestra neutral. */
  deltaPct?: number
  deltaLabel?: string
  caption: string
  sparkline?: number[]
  tone?: KpiDenseTone
  className?: string
}

/**
 * Figma "KPI · Clientes activos" y análogas (646:1489…646:1524): icono +
 * label, valor con pill de variación en línea, sub-fila con caption y
 * sparkline.
 *
 * Vive en `components/` y no dentro de una feature porque la usan dos:
 * Analítica (02.1 · Dashboard denso) y Resultados de promociones. Antes
 * estaba duplicada —`features` no se importan entre sí (CLAUDE.md §2)— y las
 * dos copias ya habían empezado a divergir: una tenía sparkline y la otra
 * una pill siempre neutral. Un solo componente es lo que hace que las dos
 * pantallas se vean como el mismo producto.
 *
 * El icono entra como componente y no como clave de un mapa: el catálogo de
 * iconos es de cada feature (clientes y recurrencia en una, mecánicas y
 * presupuesto en la otra), y centralizarlo aquí obligaría a esta tarjeta a
 * conocer los dos dominios.
 */
export function KpiDenseCard({
  label,
  icon: Icon,
  value,
  deltaPct,
  deltaLabel,
  caption,
  sparkline,
  tone = "white",
  className,
}: KpiDenseCardProps) {
  const hasDelta = deltaPct !== undefined
  const isNegative = hasDelta && deltaPct < 0
  const delta = hasDelta
    ? (deltaLabel ?? formatDeltaPercent(deltaPct / 100))
    : "—"

  return (
    <div
      className={cn(
        "flex h-full flex-1 flex-col gap-1 rounded-[20px] px-3.5 py-[11px] shadow-form-section",
        TONE_BG[tone],
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="size-[13px] text-muted-foreground" />
        <p className="text-[11px] leading-[14px] font-medium text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="flex-1 truncate text-[22px] leading-7 font-semibold text-foreground">
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
      <div className="mt-auto flex items-center gap-2">
        <p
          className="flex-1 truncate text-[10px] leading-[14px] text-muted-foreground"
          title={caption}
        >
          {caption}
        </p>
        <Sparkline
          values={sparkline ?? []}
          className="h-5 w-10 shrink-0"
          strokeClassName={TONE_STROKE[tone]}
        />
      </div>
    </div>
  )
}
