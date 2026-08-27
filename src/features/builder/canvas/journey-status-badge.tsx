import { Badge } from "@/components/ui/badge"
import {
  PUBLICATION_STATUS_LABEL,
  type DisplayStatus,
} from "@/lib/publication-status"

/**
 * Estado de una regla en píldora. Recibe el estado YA DERIVADO
 * (`publicationStatus`), no la columna: `programada` no existe en la base y
 * calcularlo aquí obligaría a pasarle también las fechas a un componente
 * que solo pinta.
 */
const STATUS_VARIANT: Record<DisplayStatus, "neutral" | "success" | "warning"> =
  {
    borrador: "neutral",
    activa: "success",
    // Publicada pero todavía fuera de vigencia: ni verde (no está evaluando)
    // ni gris (no está detenida) — va a empezar sola.
    programada: "warning",
    inactiva: "warning",
    finalizada: "neutral",
  }

export function JourneyStatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {PUBLICATION_STATUS_LABEL[status]}
    </Badge>
  )
}
