import { cn } from "@/lib/utils"

type SegmentedProps = {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

/** Figma "Filtro / Segmentado" (699:348): white active pill with shadow over bg-subtle. */
export function Segmented({
  options,
  value,
  onValueChange,
  className,
}: SegmentedProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg bg-muted p-[3px]",
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onValueChange(o.value)}
          className={cn(
            "rounded-lg px-[13px] py-1.5 text-xs leading-4",
            o.value === value
              ? "bg-background font-semibold text-foreground shadow-segmented-active"
              : "font-medium text-muted-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
