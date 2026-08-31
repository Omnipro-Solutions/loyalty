import type { CsvColumn } from "@/lib/csv"
import { formatDateTime } from "@/lib/format"

import { AUDIENCE_ORIGIN, SEGMENT_STATUS_LABEL } from "./labels"
import type { AudienceListItem } from "./queries"

export const AUDIENCES_EXPORT_FILENAME = "audiencias.csv"

/** `{key, label}` sin las funciones `value` — lo que `ExportAudiencesButton`
 *  (cliente) importa para el checklist de columnas del diálogo de export. */
export const AUDIENCES_EXPORT_COLUMN_OPTIONS = [
  { key: "id", label: "ID" },
  { key: "nombre", label: "Nombre" },
  { key: "codigo", label: "Código" },
  { key: "tamano", label: "Tamaño" },
  { key: "actualizada", label: "Actualizada" },
  { key: "estado", label: "Estado" },
  { key: "origen", label: "Origen" },
] as const

/** Server-only — solo la action de export lo importa. */
export const AUDIENCES_EXPORT_COLUMNS: CsvColumn<AudienceListItem>[] = [
  { key: "id", header: "ID", value: (a) => a.id },
  { key: "nombre", header: "Nombre", value: (a) => a.name },
  { key: "codigo", header: "Código", value: (a) => a.code },
  { key: "tamano", header: "Tamaño", value: (a) => String(a.size) },
  {
    key: "actualizada",
    header: "Actualizada",
    value: (a) => formatDateTime(a.updatedAt),
  },
  {
    key: "estado",
    header: "Estado",
    value: (a) => SEGMENT_STATUS_LABEL[a.status],
  },
  { key: "origen", header: "Origen", value: () => AUDIENCE_ORIGIN.label },
]
