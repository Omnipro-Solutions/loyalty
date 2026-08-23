import { cn } from "@/lib/utils"
import type { WorkflowStatus } from "@/types/domain"

const STATUS_META: Record<
  WorkflowStatus,
  { label: string; dotClassName: string; textClassName: string }
> = {
  publicado: {
    label: "Publicado",
    dotClassName: "bg-success",
    textClassName: "text-foreground",
  },
  pausado: {
    label: "Pausado",
    dotClassName: "bg-warning",
    textClassName: "text-foreground",
  },
  borrador: {
    label: "Borrador",
    dotClassName: "bg-border-strong",
    textClassName: "text-muted-foreground",
  },
  archivado: {
    label: "Archivado",
    dotClassName: "bg-border-strong",
    textClassName: "text-muted-foreground",
  },
}

/** Figma "08.2": punto + texto en la columna ESTADO de la tabla — más discreto que el `Badge` en píldora de la editor bar. */
export function JourneyStatusDot({ status }: { status: WorkflowStatus }) {
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
        {meta.label}
      </p>
    </div>
  )
}
