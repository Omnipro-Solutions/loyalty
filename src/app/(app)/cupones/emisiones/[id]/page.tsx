import { notFound } from "next/navigation"

import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { BatchExpandedPanel } from "@/features/coupons/components/batch-expanded-panel"
import { BatchGenerationProgress } from "@/features/coupons/components/batch-generation-progress"
import {
  COUPON_BATCH_STATUS_DOT,
  COUPON_BATCH_STATUS_LABEL,
  COUPON_ORIGIN_LABEL,
} from "@/features/coupons/lib/labels"
import {
  getCouponBatchById,
  listSampleCoupons,
} from "@/features/coupons/lib/queries"
import { batchDiscountDisplay } from "@/features/coupons/lib/recap"
import { formatNumber, formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CouponBatchStatus, CouponOrigin } from "@/types/domain"

/** Sin nodo de Figma (el mockup no llega a esta pantalla) — se compone con el design system existente. Fase 6: aquí retoma la generación un batch grande si la pestaña se cerró a medias. */
export default async function CouponBatchDetailPage({
  params,
}: PageProps<"/cupones/emisiones/[id]">) {
  const { id } = await params

  const batch = await getCouponBatchById(id)
  if (!batch) notFound()

  const samples = await listSampleCoupons([batch.id], 8)
  const sampleCoupons = (samples[batch.id] ?? []).map((c) => ({
    code: c.code,
    memberNombre: c.memberNombre,
  }))

  const status = batch.status as CouponBatchStatus
  const { headline, subtitle } = batchDiscountDisplay(
    batch,
    batch.free_product?.sku
  )

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Cupones  ›  ${batch.reference}`}
      title={batch.reference}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-foreground">
              {batch.reference}
            </p>
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <span
                className={cn(
                  "size-[7px] shrink-0 rounded-full",
                  COUPON_BATCH_STATUS_DOT[status]
                )}
              />
              {COUPON_BATCH_STATUS_LABEL[status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {batch.name} · {COUPON_ORIGIN_LABEL[batch.origin as CouponOrigin]} ·{" "}
            {headline}
            {subtitle ? ` ${subtitle}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          label="Generados"
          value={`${formatNumber(batch.generated_count)} / ${formatNumber(batch.requested_quantity)}`}
        />
        <KpiCard label="Asignados" value={formatNumber(batch.assigned_count)} />
        <KpiCard label="Canjeados" value={formatNumber(batch.redeemed_count)} />
        <KpiCard label="Anulados" value={formatNumber(batch.cancelled_count)} />
        <KpiCard
          label="Vigencia"
          value={batch.valid_to ? formatShortDate(batch.valid_to) : "Sin fin"}
          detail={`desde el ${formatShortDate(batch.valid_from)}`}
        />
      </div>

      {status === "generating" && (
        <BatchGenerationProgress
          batchId={batch.id}
          initialGenerated={batch.generated_count}
          initialTotal={batch.requested_quantity}
        />
      )}

      <div className="rounded-2xl bg-background shadow-form-section">
        <BatchExpandedPanel batch={batch} sampleCoupons={sampleCoupons} />
      </div>
    </AppPage>
  )
}
