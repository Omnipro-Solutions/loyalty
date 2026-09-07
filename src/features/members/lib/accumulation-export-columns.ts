import type { CsvColumn } from "@/lib/csv"

import { ACCUMULATION_STATUS_LABEL } from "./accumulation-labels"
import type { MemberAccumulationRow } from "./queries"

export const ACCUMULATIONS_EXPORT_FILENAME = "acumulaciones.csv"

/**
 * `{key, label}` sin las funciones `value` — es lo único que el diálogo de
 * export (cliente) necesita, sin arrastrar los formateadores al bundle.
 * Mismo patrón que `MEMBERS_EXPORT_COLUMN_OPTIONS`.
 */
export const ACCUMULATIONS_EXPORT_COLUMN_OPTIONS = [
  { key: "socio", label: "Socio" },
  { key: "codigo_socio", label: "Código de socio" },
  { key: "promocion", label: "Promoción" },
  { key: "codigo_promocion", label: "Código de promoción" },
  { key: "mecanica", label: "Mecánica" },
  { key: "sku", label: "SKU" },
  { key: "producto", label: "Producto" },
  { key: "compradas", label: "Piezas compradas" },
  { key: "en_ciclo", label: "Piezas del ciclo" },
  { key: "faltan", label: "Faltan" },
  { key: "estado", label: "Estado" },
  { key: "por_reclamar", label: "Piezas por reclamar" },
  { key: "ahorro", label: "Ahorro" },
  { key: "vence", label: "Vence" },
] as const

/** Server-only — solo la action de export lo importa. */
export const ACCUMULATIONS_EXPORT_COLUMNS: CsvColumn<MemberAccumulationRow>[] =
  [
    { key: "socio", header: "Socio", value: (r) => r.socioNombre },
    {
      key: "codigo_socio",
      header: "Código de socio",
      value: (r) => r.socioCodigo ?? "",
    },
    { key: "promocion", header: "Promoción", value: (r) => r.promocionNombre },
    {
      key: "codigo_promocion",
      header: "Código de promoción",
      value: (r) => r.promocionCodigo,
    },
    {
      key: "mecanica",
      header: "Mecánica",
      // "3x2" se lee de un vistazo en una hoja de cálculo; "por_piezas", no.
      value: (r) => `${String(r.compraCantidad)}x${String(r.pagaCantidad)}`,
    },
    { key: "sku", header: "SKU", value: (r) => r.sku ?? "" },
    { key: "producto", header: "Producto", value: (r) => r.nombre },
    {
      key: "compradas",
      header: "Piezas compradas",
      value: (r) => String(r.unidadesCompradas),
    },
    {
      key: "en_ciclo",
      header: "Piezas del ciclo",
      value: (r) => String(r.unidadesEnCiclo),
    },
    { key: "faltan", header: "Faltan", value: (r) => String(r.faltan) },
    {
      key: "estado",
      header: "Estado",
      value: (r) => ACCUMULATION_STATUS_LABEL[r.estado],
    },
    {
      key: "por_reclamar",
      header: "Piezas por reclamar",
      value: (r) => String(r.piezasPorReclamar),
    },
    { key: "ahorro", header: "Ahorro", value: (r) => r.ahorro.toFixed(2) },
    { key: "vence", header: "Vence", value: (r) => r.vigenteHasta ?? "" },
  ]
