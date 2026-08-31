import type { CsvColumn } from "@/lib/csv"

import type { WorkflowExportRow } from "./queries"

export const WORKFLOWS_EXPORT_FILENAME = "workflows.csv"

/** `{key, label}` sin las funciones `value` — lo que `JourneysToolbar`
 *  (cliente) importa para el checklist de columnas del diálogo de export. */
export const WORKFLOWS_EXPORT_COLUMN_OPTIONS = [
  { key: "workflow", label: "Workflow" },
  { key: "estado", label: "Estado" },
  { key: "nodos", label: "Nodos" },
  { key: "editado_por", label: "Editado por" },
  { key: "actualizado", label: "Actualizado" },
] as const

/** Server-only — solo la action de export lo importa. */
export const WORKFLOWS_EXPORT_COLUMNS: CsvColumn<WorkflowExportRow>[] = [
  { key: "workflow", header: "Workflow", value: (w) => w.nombre },
  { key: "estado", header: "Estado", value: (w) => w.estado },
  { key: "nodos", header: "Nodos", value: (w) => String(w.totalNodes) },
  {
    key: "editado_por",
    header: "Editado por",
    value: (w) => w.authorName ?? "",
  },
  {
    key: "actualizado",
    header: "Actualizado",
    value: (w) => w.actualizado_en,
  },
]
