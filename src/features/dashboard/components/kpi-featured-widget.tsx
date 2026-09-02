import { cn } from "@/lib/utils"

type KpiFeaturedWidgetProps = {
  label: string
  value: string
  goalBadge: string
  progressPct: number
  caption: string
  className?: string
}

/**
 * Figma "Widget / KPI · destacado" (731:412 / 734:4644): tarjeta con barra
 * de progreso hacia una meta. Superficie neutra igual que el resto de KPIs
 * de la pantalla — antes era `bg-primary` a sangre completa, la única
 * superficie 100% saturada del dashboard aparte del item activo del
 * sidebar (refactor "un solo acento", CLAUDE.md §8). El acento queda solo
 * en la barra de progreso.
 */
export function KpiFeaturedWidget({
  label,
  value,
  goalBadge,
  progressPct,
  caption,
  className,
}: KpiFeaturedWidgetProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-2.5 rounded-[20px] bg-background p-[18px] shadow-form-section",
        className
      )}
    >
      <p className="text-xs leading-[17px] font-medium text-muted-foreground">
        {label}
      </p>
      <div className="flex w-full items-center gap-2">
        <p className="flex-1 text-[30px] leading-[34px] font-bold tracking-[-1px] text-foreground">
          {value}
        </p>
        <span className="shrink-0 rounded-full bg-muted px-[9px] py-[3px] text-[11px] leading-[15px] font-medium whitespace-nowrap text-muted-foreground">
          {goalBadge}
        </span>
      </div>
      <div className="h-[7px] w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-[10px] leading-[14px] text-muted-foreground">
        {caption}
      </p>
    </div>
  )
}
