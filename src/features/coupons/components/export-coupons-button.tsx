"use client"

import { Download } from "lucide-react"

import type { CouponBatchStatus, CouponOrigin } from "@/types/domain"

import { csvCell, downloadCsv } from "../lib/csv"
import { COUPON_BATCH_STATUS_LABEL, COUPON_ORIGIN_LABEL } from "../lib/labels"
import type { CouponBatch, CouponSearchRow } from "../lib/queries"

const BATCH_COLUMNS: { header: string; value: (b: CouponBatch) => string }[] = [
  { header: "Referencia", value: (b) => b.reference },
  { header: "Nombre", value: (b) => b.name },
  {
    header: "Origen",
    value: (b) => COUPON_ORIGIN_LABEL[b.origin as CouponOrigin],
  },
  { header: "Solicitados", value: (b) => String(b.requested_quantity) },
  { header: "Generados", value: (b) => String(b.generated_count) },
  {
    header: "Estado",
    value: (b) => COUPON_BATCH_STATUS_LABEL[b.status as CouponBatchStatus],
  },
  { header: "Creada", value: (b) => b.created_at },
]

const COUPON_COLUMNS: {
  header: string
  value: (c: CouponSearchRow) => string
}[] = [
  { header: "Código", value: (c) => c.code },
  { header: "Persona", value: (c) => c.member_nombre ?? "Al portador" },
  { header: "Email", value: (c) => c.member_email ?? "" },
  { header: "Emisión", value: (c) => c.batch_reference ?? "" },
  { header: "Estado", value: (c) => c.status },
  { header: "Creado", value: (c) => c.created_at },
]

/** Exporta la página actual (25 filas), mismo alcance que `ExportPromotionsButton` — regla 7.8 del doc (exportar el universo completo) queda para una acción de servidor futura. */
export function ExportCouponsButton(
  props:
    | { view: "batches"; batches: CouponBatch[] }
    | { view: "coupons"; coupons: CouponSearchRow[] }
) {
  function handleExport() {
    if (props.view === "batches") {
      downloadCsv("emisiones.csv", [
        BATCH_COLUMNS.map((c) => csvCell(c.header)),
        ...props.batches.map((b) =>
          BATCH_COLUMNS.map((c) => csvCell(c.value(b)))
        ),
      ])
    } else {
      downloadCsv("cupones.csv", [
        COUPON_COLUMNS.map((c) => csvCell(c.header)),
        ...props.coupons.map((c) =>
          COUPON_COLUMNS.map((col) => csvCell(col.value(c)))
        ),
      ])
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-[7px] rounded-[10px] border border-border bg-background py-[9px] pr-3.5 pl-3 text-xs font-medium text-secondary-foreground"
    >
      <Download className="size-3.5" />
      Exportar
    </button>
  )
}
