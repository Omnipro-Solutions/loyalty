import type { CouponBatchStatus, CouponOrigin } from "@/types/domain"

import type { CsvColumn } from "@/lib/csv"

import { COUPON_BATCH_STATUS_LABEL, COUPON_ORIGIN_LABEL } from "./labels"
import type { CouponBatch, CouponSearchRow } from "./queries"

export const BATCH_COUPONS_EXPORT_FILENAME_FALLBACK = "emision"
export const COUPON_BATCHES_EXPORT_FILENAME = "emisiones.csv"
export const COUPONS_EXPORT_FILENAME = "cupones.csv"

/** `{key, label}` sin las funciones `value` — lo que `ExportBatchCouponsButton`
 *  (cliente) importa para el checklist de columnas del diálogo de export. */
export const BATCH_COUPONS_EXPORT_COLUMN_OPTIONS = [
  { key: "codigo", label: "Código" },
  { key: "persona", label: "Persona" },
  { key: "email", label: "Email" },
  { key: "estado", label: "Estado" },
  { key: "creado", label: "Creado" },
] as const

/** Server-only — solo la action de export lo importa. */
export const BATCH_COUPONS_EXPORT_COLUMNS: CsvColumn<CouponSearchRow>[] = [
  { key: "codigo", header: "Código", value: (r) => r.code },
  {
    key: "persona",
    header: "Persona",
    value: (r) => r.member_nombre ?? "Al portador",
  },
  { key: "email", header: "Email", value: (r) => r.member_email ?? "" },
  { key: "estado", header: "Estado", value: (r) => r.status },
  { key: "creado", header: "Creado", value: (r) => r.created_at },
]

/** Columnas del listado de EMISIONES (13.1, vista "batches") — distinto del
 *  export de una sola emisión (`BATCH_COUPONS_EXPORT_COLUMNS`, arriba). */
export const COUPON_BATCHES_EXPORT_COLUMN_OPTIONS = [
  { key: "referencia", label: "Referencia" },
  { key: "nombre", label: "Nombre" },
  { key: "origen", label: "Origen" },
  { key: "solicitados", label: "Solicitados" },
  { key: "generados", label: "Generados" },
  { key: "estado", label: "Estado" },
  { key: "creada", label: "Creada" },
] as const

/** Server-only — solo la action de export lo importa. */
export const COUPON_BATCHES_EXPORT_COLUMNS: CsvColumn<CouponBatch>[] = [
  { key: "referencia", header: "Referencia", value: (b) => b.reference },
  { key: "nombre", header: "Nombre", value: (b) => b.name },
  {
    key: "origen",
    header: "Origen",
    value: (b) => COUPON_ORIGIN_LABEL[b.origin as CouponOrigin],
  },
  {
    key: "solicitados",
    header: "Solicitados",
    value: (b) => String(b.requested_quantity),
  },
  {
    key: "generados",
    header: "Generados",
    value: (b) => String(b.generated_count),
  },
  {
    key: "estado",
    header: "Estado",
    value: (b) => COUPON_BATCH_STATUS_LABEL[b.status as CouponBatchStatus],
  },
  { key: "creada", header: "Creada", value: (b) => b.created_at },
]

/** Columnas del listado de CUPONES (13.1, vista "coupons"). */
export const COUPONS_EXPORT_COLUMN_OPTIONS = [
  { key: "codigo", label: "Código" },
  { key: "persona", label: "Persona" },
  { key: "email", label: "Email" },
  { key: "emision", label: "Emisión" },
  { key: "estado", label: "Estado" },
  { key: "creado", label: "Creado" },
] as const

/** Server-only — solo la action de export lo importa. */
export const COUPONS_EXPORT_COLUMNS: CsvColumn<CouponSearchRow>[] = [
  { key: "codigo", header: "Código", value: (c) => c.code },
  {
    key: "persona",
    header: "Persona",
    value: (c) => c.member_nombre ?? "Al portador",
  },
  { key: "email", header: "Email", value: (c) => c.member_email ?? "" },
  {
    key: "emision",
    header: "Emisión",
    value: (c) => c.batch_reference ?? "",
  },
  { key: "estado", header: "Estado", value: (c) => c.status },
  { key: "creado", header: "Creado", value: (c) => c.created_at },
]
