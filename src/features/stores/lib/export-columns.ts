import type { CsvColumn } from "@/lib/csv"

import { STORE_STATUS_LABEL, STORE_FORMAT_LABEL } from "./labels"
import type { Store } from "./queries"

export const STORES_EXPORT_FILENAME = "tiendas.csv"

/** `{key, label}` sin las funciones `value` — lo que `ExportStoresButton`
 *  (cliente) importa para el checklist de columnas del diálogo de export. */
export const STORES_EXPORT_COLUMN_OPTIONS = [
  { key: "tienda", label: "Tienda" },
  { key: "codigo", label: "Código" },
  { key: "ciudad", label: "Ciudad" },
  { key: "direccion", label: "Dirección" },
  { key: "telefono", label: "Teléfono" },
  { key: "email", label: "Email" },
  { key: "formato", label: "Formato" },
  { key: "estado", label: "Estado" },
  { key: "grupo", label: "Grupo" },
] as const

/** Server-only — solo la action de export lo importa. `groupNameById` se
 *  resuelve dentro de la action (una llamada a `listStoreGroups()`), no en
 *  el cliente. */
export function storesExportColumns(
  groupNameById: Map<string, string>
): CsvColumn<Store>[] {
  return [
    { key: "tienda", header: "Tienda", value: (s) => s.nombre },
    { key: "codigo", header: "Código", value: (s) => s.codigo_tienda },
    { key: "ciudad", header: "Ciudad", value: (s) => s.ciudad },
    {
      key: "direccion",
      header: "Dirección",
      value: (s) => `${s.direccion}, ${s.colonia}`,
    },
    { key: "telefono", header: "Teléfono", value: (s) => s.telefono },
    { key: "email", header: "Email", value: (s) => s.email },
    {
      key: "formato",
      header: "Formato",
      value: (s) =>
        STORE_FORMAT_LABEL[s.formato as keyof typeof STORE_FORMAT_LABEL] ??
        s.formato,
    },
    {
      key: "estado",
      header: "Estado",
      value: (s) =>
        STORE_STATUS_LABEL[s.estado as keyof typeof STORE_STATUS_LABEL] ??
        s.estado,
    },
    {
      key: "grupo",
      header: "Grupo",
      value: (s) => groupNameById.get(s.grupo_id) ?? "—",
    },
  ]
}
