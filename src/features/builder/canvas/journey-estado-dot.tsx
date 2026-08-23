import { cn } from "@/lib/utils"
import type { WorkflowEstado } from "@/types/domain"

const ESTADO_META: Record<
  WorkflowEstado,
  { etiqueta: string; dotClassName: string; textClassName: string }
> = {
  publicado: {
    etiqueta: "Publicado",
    dotClassName: "bg-success",
    textClassName: "text-foreground",
  },
  pausado: {
    etiqueta: "Pausado",
    dotClassName: "bg-warning",
    textClassName: "text-foreground",
  },
  borrador: {
    etiqueta: "Borrador",
    dotClassName: "bg-border-strong",
    textClassName: "text-muted-foreground",
  },
  archivado: {
    etiqueta: "Archivado",
    dotClassName: "bg-border-strong",
    textClassName: "text-muted-foreground",
  },
}

/** Figma "08.2": punto + texto en la columna ESTADO de la tabla — más discreto que el `Badge` en píldora de la editor bar. */
export function JourneyEstadoDot({ estado }: { estado: WorkflowEstado }) {
  const meta = ESTADO_META[estado]
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
        {meta.etiqueta}
      </p>
    </div>
  )
}
