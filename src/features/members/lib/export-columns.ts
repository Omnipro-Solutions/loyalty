import type { CsvColumn } from "@/lib/csv"

import { MEMBER_STATUS_LABEL, TIER_LABEL } from "./labels"
import type { Member } from "./queries"

export const MEMBERS_EXPORT_FILENAME = "clientes.csv"

/**
 * `{key, label}` sin las funciones `value` — es lo único que
 * `ExportMembersButton` (cliente) importa de este módulo, para el
 * checklist de columnas del diálogo de export sin arrastrar `TIER_LABEL`/
 * `MEMBER_STATUS_LABEL` al bundle del cliente.
 */
export const MEMBERS_EXPORT_COLUMN_OPTIONS = [
  { key: "nombre", label: "Nombre" },
  { key: "email", label: "Email" },
  { key: "codigo_socio", label: "Código de socio" },
  { key: "documento", label: "Documento" },
  { key: "telefono", label: "Teléfono" },
  { key: "nivel", label: "Nivel" },
  { key: "puntos", label: "Puntos" },
  { key: "registro", label: "Registro" },
  { key: "estado", label: "Estado" },
] as const

/** Server-only — solo la action de export lo importa. */
export const MEMBERS_EXPORT_COLUMNS: CsvColumn<Member>[] = [
  {
    key: "nombre",
    header: "Nombre",
    value: (m) => `${m.nombre} ${m.apellido}`.trim(),
  },
  { key: "email", header: "Email", value: (m) => m.email },
  {
    key: "codigo_socio",
    header: "Código de socio",
    value: (m) => m.codigo_socio ?? "",
  },
  {
    key: "documento",
    header: "Documento",
    value: (m) =>
      m.numero_documento
        ? `${m.tipo_documento ?? ""} ${m.numero_documento}`.trim()
        : "",
  },
  { key: "telefono", header: "Teléfono", value: (m) => m.telefono ?? "" },
  {
    key: "nivel",
    header: "Nivel",
    value: (m) =>
      m.tier
        ? (TIER_LABEL[m.tier.nombre as keyof typeof TIER_LABEL] ??
          m.tier.nombre)
        : "",
  },
  { key: "puntos", header: "Puntos", value: (m) => String(m.saldo_puntos) },
  { key: "registro", header: "Registro", value: (m) => m.fecha_alta },
  {
    key: "estado",
    header: "Estado",
    value: (m) =>
      MEMBER_STATUS_LABEL[
        m.estado_cuenta as keyof typeof MEMBER_STATUS_LABEL
      ] ?? m.estado_cuenta,
  },
]
