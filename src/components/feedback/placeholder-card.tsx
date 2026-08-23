import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PlaceholderCardProps = {
  icon: LucideIcon
  title: string
  description: string
  compact?: boolean
  className?: string
}

/**
 * Temporary placeholder for Figma sections that need a subsystem this
 * project doesn't have yet (orders, promotion engine, scoring) —
 * pixel-perfect in structure, honest that the real content doesn't exist
 * yet, instead of faking data.
 */
export function PlaceholderCard({
  icon: Icon,
  title,
  description,
  compact,
  className,
}: PlaceholderCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40",
        compact
          ? "px-4 py-3"
          : "flex-col justify-center gap-2 px-5 py-8 text-center",
        className
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className={cn("min-w-0", compact && "flex-1")}>
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant="neutral" className="shrink-0">
        Próximamente
      </Badge>
    </div>
  )
}
