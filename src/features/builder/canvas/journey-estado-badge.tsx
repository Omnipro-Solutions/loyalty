import { Badge } from "@/components/ui/badge"
import type { WorkflowEstado } from "@/types/domain"

const ESTADO_META: Record<
  WorkflowEstado,
  { etiqueta: string; variant: "neutral" | "success" | "warning" }
> = {
  borrador: { etiqueta: "Borrador", variant: "neutral" },
  publicado: { etiqueta: "Publicado", variant: "success" },
  pausado: { etiqueta: "Pausado", variant: "warning" },
  archivado: { etiqueta: "Archivado", variant: "neutral" },
}

export function JourneyEstadoBadge({ estado }: { estado: WorkflowEstado }) {
  const meta = ESTADO_META[estado]
  return <Badge variant={meta.variant}>{meta.etiqueta}</Badge>
}
