import { ExportCouponsButton } from "./export-coupons-button"
import type { CouponBatch, CouponSearchRow } from "../lib/queries"

type CouponsExportSectionProps =
  | {
      view: "batches"
      batchesPromise: Promise<{ batches: CouponBatch[]; total: number }>
    }
  | {
      view: "coupons"
      couponsPromise: Promise<{ coupons: CouponSearchRow[]; total: number }>
    }

/** Comparte la promesa con la sección de tabla — una sola consulta por vista. Sin key: solo espera, no necesita remontarse. */
export async function CouponsExportSection(props: CouponsExportSectionProps) {
  if (props.view === "batches") {
    const { batches } = await props.batchesPromise
    return <ExportCouponsButton view="batches" batches={batches} />
  }
  const { coupons } = await props.couponsPromise
  return <ExportCouponsButton view="coupons" coupons={coupons} />
}
