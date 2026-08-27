import {
  PUBLICATION_STATUS_LABEL,
  type DisplayStatus,
} from "@/lib/publication-status"
import { cn } from "@/lib/utils"

const STATUS_META: Record<
  DisplayStatus,
  { dotClassName: string; textClassName: string }
> = {
  activa: { dotClassName: "bg-success", textClassName: "text-foreground" },
  programada: {
    dotClassName: "bg-warning",
    textClassName: "text-foreground",
  },
  inactiva: { dotClassName: "bg-warning", textClassName: "text-foreground" },
  borrador: {
    dotClassName: "bg-border-strong",
    textClassName: "text-muted-foreground",
  },
  finalizada: {
    dotClassName: "bg-border-strong",
    textClassName: "text-muted-foreground",
  },
}

/** Figma "08.2": punto + texto en la columna ESTADO de la tabla — más discreto que el `Badge` en píldora de la editor bar. */
export function JourneyStatusDot({ status }: { status: DisplayStatus }) {
  const meta = STATUS_META[status]
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn("size-[7px] shrink-0 rounded-full", meta.dotClassName)}
      />
      <p
        className={cn(
          "text-xs font-medium whitespace-nowrap",
          meta.textClassName
        )}
      >
        {PUBLICATION_STATUS_LABEL[status]}
      </p>
    </div>
  )
}
