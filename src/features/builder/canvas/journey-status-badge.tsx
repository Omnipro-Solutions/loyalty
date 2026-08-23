import { Badge } from "@/components/ui/badge"
import type { WorkflowStatus } from "@/types/domain"

const STATUS_META: Record<
  WorkflowStatus,
  { label: string; variant: "neutral" | "success" | "warning" }
> = {
  borrador: { label: "Borrador", variant: "neutral" },
  publicado: { label: "Publicado", variant: "success" },
  pausado: { label: "Pausado", variant: "warning" },
  archivado: { label: "Archivado", variant: "neutral" },
}

export function JourneyStatusBadge({ status }: { status: WorkflowStatus }) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
