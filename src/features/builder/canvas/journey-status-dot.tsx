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
  pendiente_aprobacion: {
    dotClassName: "bg-warning",
    textClassName: "text-foreground",
  },
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

/**
 * Figma "08.2": punto + texto en la columna ESTADO de la tabla — más discreto
 * que el `Badge` en píldora de la editor bar.
 *
 * `status` viene de una columna `text` en Supabase, no de un enum de
 * Postgres (ver CLAUDE.md) — el cast a `WorkflowStatus` en `queries.ts` no
 * garantiza en runtime que el dato coincida con `WORKFLOW_STATUSES`, así que
 * cualquier valor fuera de ese conjunto cae a "borrador" en vez de tumbar la
 * tabla completa.
 */
export function JourneyStatusDot({ status }: { status: DisplayStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.borrador
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
