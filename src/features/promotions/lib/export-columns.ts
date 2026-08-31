import type { CsvColumn } from "@/lib/csv"

import { PROMOTION_TYPE_LABEL } from "./labels"
import type { Promotion } from "./queries"

export const PROMOTIONS_EXPORT_FILENAME = "promociones.csv"

/** `{key, label}` sin las funciones `value` — lo que `ExportPromotionsButton`
 *  (cliente) importa para el checklist de columnas del diálogo de export. */
export const PROMOTIONS_EXPORT_COLUMN_OPTIONS = [
  { key: "nombre", label: "Nombre" },
  { key: "codigo", label: "Código" },
  { key: "tipo", label: "Tipo" },
  { key: "canjes", label: "Canjes" },
  { key: "presupuesto_asignado", label: "Presupuesto asignado" },
  { key: "presupuesto_consumido", label: "Presupuesto consumido" },
  { key: "vigente_desde", label: "Vigente desde" },
  { key: "vigente_hasta", label: "Vigente hasta" },
  { key: "estado", label: "Estado" },
] as const

/** Server-only — solo la action de export lo importa. */
export const PROMOTIONS_EXPORT_COLUMNS: CsvColumn<Promotion>[] = [
  { key: "nombre", header: "Nombre", value: (p) => p.nombre },
  { key: "codigo", header: "Código", value: (p) => p.codigo },
  {
    key: "tipo",
    header: "Tipo",
    value: (p) => PROMOTION_TYPE_LABEL[p.tipo as never],
  },
  { key: "canjes", header: "Canjes", value: (p) => String(p.canjes) },
  {
    key: "presupuesto_asignado",
    header: "Presupuesto asignado",
    value: (p) => String(p.presupuesto_asignado),
  },
  {
    key: "presupuesto_consumido",
    header: "Presupuesto consumido",
    value: (p) => String(p.presupuesto_consumido),
  },
  {
    key: "vigente_desde",
    header: "Vigente desde",
    value: (p) => p.vigente_desde,
  },
  {
    key: "vigente_hasta",
    header: "Vigente hasta",
    value: (p) => p.vigente_hasta ?? "",
  },
  { key: "estado", header: "Estado", value: (p) => p.estado_publicacion },
]
