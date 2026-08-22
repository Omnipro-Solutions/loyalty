import { cn } from "@/lib/utils"

type ChipProps = {
  children: React.ReactNode
  active?: boolean
  conteo?: number
  onClick?: () => void
  className?: string
}

/** Figma "Filtro / Chip" (699:311): Default/Activo/Con conteo. */
export function Chip({
  children,
  active,
  conteo,
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
      {children}
      {typeof conteo === "number" && (
        <span className="rounded-full bg-muted px-[7px] py-px text-[10px] leading-[14px] font-semibold text-muted-foreground">
          {conteo}
        </span>
      )}
    </button>
  )
}
