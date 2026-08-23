import { Badge } from "@/components/ui/badge"
import type { WorkflowStatus } from "@/types/domain"

const ESTADO_META: Record<
  WorkflowStatus,
  { etiqueta: string; variant: "neutral" | "success" | "warning" }
> = {
  borrador: { etiqueta: "Borrador", variant: "neutral" },
  publicado: { etiqueta: "Publicado", variant: "success" },
  pausado: { etiqueta: "Pausado", variant: "warning" },
  archivado: { etiqueta: "Archivado", variant: "neutral" },
}

export function JourneyEstadoBadge({ estado }: { estado: WorkflowStatus }) {
  const meta = ESTADO_META[estado]
  return <Badge variant={meta.variant}>{meta.etiqueta}</Badge>
}
