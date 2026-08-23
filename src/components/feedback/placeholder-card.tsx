import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type PlaceholderCardProps = {
  icon: LucideIcon
  titulo: string
  descripcion: string
  compact?: boolean
  className?: string
}

/**
 * Marcador temporal para secciones del Figma que necesitan un subsistema
 * que este proyecto no tiene todavía (pedidos, motor de promociones,
 * scoring) — pixel-perfect en estructura, honesto en que el contenido
 * real todavía no existe, en vez de simular datos.
 */
export function PlaceholderCard({
  icon: Icon,
  titulo,
  descripcion,
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
        <p className="text-[13px] font-semibold text-foreground">{titulo}</p>
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      </div>
      <Badge variant="neutral" className="shrink-0">
        Próximamente
      </Badge>
    </div>
  )
}
