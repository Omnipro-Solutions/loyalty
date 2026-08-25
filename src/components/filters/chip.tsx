import { cn } from "@/lib/utils"

type ChipProps = {
  children: React.ReactNode
  active?: boolean
  count?: React.ReactNode
  /** Punto de color antes del texto (p.ej. estado de una emisión/cupón) — clase `bg-*` completa. */
  dotClassName?: string
  onClick?: () => void
  className?: string
}

/** Figma "Filtro / Chip" (699:311): Default/Activo/Con count, más un punto de color opcional (listados de 13 · Cupones). */
export function Chip({
  children,
  active,
  count,
  dotClassName,
  onClick,
  className,
}: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-[7px] rounded-full px-3.5 py-2 text-xs leading-4 font-medium",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background text-muted-foreground",
        className
      )}
    >
      {dotClassName && (
        <span
          className={cn("size-[7px] shrink-0 rounded-full", dotClassName)}
        />
      )}
      {children}
      {(typeof count === "number" || count) && (
        <span className="rounded-full bg-muted px-[7px] py-px text-[10px] leading-[14px] font-semibold text-muted-foreground">
          {count}
        </span>
      )}
    </button>
  )
}
