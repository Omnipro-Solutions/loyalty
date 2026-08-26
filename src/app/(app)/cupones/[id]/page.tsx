import { notFound } from "next/navigation"

import { KpiCard } from "@/components/data/kpi-card"
import { AppPage } from "@/components/layout/app-page"
import { BackLink } from "@/components/layout/back-link"
import { CouponAssignmentsList } from "@/features/coupons/components/coupon-assignments-list"
import { CouponDetailActions } from "@/features/coupons/components/coupon-detail-actions"
import {
  COUPON_DETAIL_TABS,
  CouponDetailTabsNav,
  type CouponDetailTab,
} from "@/features/coupons/components/coupon-detail-tabs-nav"
import { CouponEventTimeline } from "@/features/coupons/components/coupon-event-timeline"
import { CouponOriginCard } from "@/features/coupons/components/coupon-origin-card"
import { CouponRedemptionsList } from "@/features/coupons/components/coupon-redemptions-list"
import { CouponRulesTab } from "@/features/coupons/components/coupon-rules-tab"
import { CouponVoucher } from "@/features/coupons/components/coupon-voucher"
import {
  COUPON_DISPLAY_STATUS_DOT,
  COUPON_DISPLAY_STATUS_LABEL,
  COUPON_PRINT_LAYOUT_LABEL,
} from "@/features/coupons/lib/labels"
import {
  getCouponBatchById,
  getCouponById,
  getProfileWithPermissions,
  listCouponAssignments,
  listCouponEvents,
  listCouponPrintJobs,
  listCouponRedemptions,
  listRestrictionCategories,
  listRestrictionStores,
  type CouponBatchListItem,
  type CouponWithHolder,
} from "@/features/coupons/lib/queries"
import { hasPermission } from "@/features/coupons/lib/permissions"
import { couponDiscountDisplay } from "@/features/coupons/lib/recap"
import {
  couponStatus,
  couponStatusSince,
  daysUntilValid,
} from "@/features/coupons/lib/status"
import { barcodeSvgFor, qrSvgFor } from "@/features/coupons/lib/voucher-svg"
import { formatNumber, formatShortDate, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  CouponOrigin,
  CouponPrintLayout,
  CouponStatus,
} from "@/types/domain"

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

async function EventsTabContent({ couponId }: { couponId: string }) {
  const events = await listCouponEvents(couponId)
  return (
    <>
      <CouponEventTimeline events={events} />
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3.5">
        <p className="text-[11px] text-muted-foreground">
          Log append-only: los eventos no se editan ni se borran. Incluye actor,
          sello de tiempo e IP cuando aplica.
        </p>
        {/* Fase 4 conecta la exportación real del log. */}
        <button
          type="button"
          disabled
          title="Exportar log (próximamente)"
          className="shrink-0 text-xs font-medium text-primary opacity-50"
        >
          Exportar log
        </button>
      </div>
    </>
  )
}

async function PersonasTabContent({ couponId }: { couponId: string }) {
  const assignments = await listCouponAssignments(couponId)
  return <CouponAssignmentsList assignments={assignments} />
}

export default async function CouponDetailPage({
  params,
  searchParams,
}: PageProps<"/cupones/[id]">) {
  const { id } = await params
  const sp = await searchParams
  const tab = (firstValue(sp.tab) ??
    COUPON_DETAIL_TABS[0].value) as CouponDetailTab

  const coupon = await getCouponById(id)
  if (!coupon) notFound()

  const batch = await getCouponBatchById(coupon.batch_id)
  if (!batch) notFound()

  // Siempre se necesitan (fila de KPIs), fuera de las pestañas.
  const [redemptions, printJobs, profile] = await Promise.all([
    listCouponRedemptions(id),
    listCouponPrintJobs(id),
    getProfileWithPermissions(),
  ])
  const isCancelled = coupon.status === "cancelled"
  const canEmitir =
    !isCancelled &&
    (profile ? hasPermission(profile.permissions, "cupones", "emitir") : false)
  const canAnular =
    !isCancelled &&
    (profile ? hasPermission(profile.permissions, "cupones", "anular") : false)
  const canImprimir = profile
    ? hasPermission(profile.permissions, "cupones", "imprimir")
    : false
  const canRefundPoints =
    coupon.points_charged_at != null &&
    !coupon.points_refunded &&
    coupon.member_id != null &&
    (coupon.points_cost ?? 0) > 0

  const displayStatus = couponStatus({
    status: coupon.status as CouponStatus,
    valid_to: coupon.valid_to,
  })
  const { headline, subtitle } = couponDiscountDisplay(
    coupon,
    batch,
    batch.free_product?.sku
  )

  const code = coupon.qr_value || coupon.code
  const qrSvg = await qrSvgFor(code)
  const barcodeSvg = barcodeSvgFor(code)

  const validitySummary = [
    `Válido del ${formatShortDate(coupon.valid_from)} al ${coupon.valid_to ? formatShortDate(coupon.valid_to) : "sin fin"}`,
    coupon.min_purchase_amount != null
      ? `compra mínima ${formatUSD(coupon.min_purchase_amount)}`
      : null,
    `${formatNumber(coupon.max_uses)} uso${coupon.max_uses === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ")

  const holderLabel = coupon.member?.nombre ?? "al portador"
  const headerSummary = [
    subtitle ? `${headline} ${subtitle}` : headline,
    `titular ${holderLabel}`,
    coupon.valid_to
      ? `vigente hasta el ${formatShortDate(coupon.valid_to)}`
      : "sin fecha de vencimiento",
  ].join(" · ")

  const statusSince = couponStatusSince({
    ...coupon,
    status: coupon.status as CouponStatus,
  })
  const rejectedAttempts = redemptions.filter(
    (r) => r.result === "rejected"
  ).length
  const lastPrintJob = printJobs[0]
  const daysLeft = daysUntilValid(coupon)
  const expiryValue =
    daysLeft == null
      ? "Sin vigencia"
      : daysLeft < 0
        ? "Vencido"
        : daysLeft === 0
          ? "Hoy"
          : `${formatNumber(daysLeft)} días`

  return (
    <AppPage
      breadcrumb={`Comercial  ›  Cupones  ›  ${coupon.code}`}
      title={coupon.code}
    >
      <BackLink href="/cupones?vista=coupons">Volver</BackLink>

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-foreground">{coupon.code}</p>
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <span
                className={cn(
                  "size-[7px] shrink-0 rounded-full",
                  COUPON_DISPLAY_STATUS_DOT[displayStatus]
                )}
              />
              {COUPON_DISPLAY_STATUS_LABEL[displayStatus]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{headerSummary}</p>
        </div>
        <CouponDetailActions
          couponId={coupon.id}
          couponCode={coupon.code}
          batchId={batch.id}
          sequence={coupon.sequence}
          origin={batch.origin as CouponOrigin}
          canRefundPoints={canRefundPoints}
          currentValidTo={coupon.valid_to}
          canEmitir={canEmitir}
          canAnular={canAnular}
          canImprimir={canImprimir}
          isCancelled={isCancelled}
        />
      </div>

      <div className="grid grid-cols-[320px_1fr] items-start gap-5">
        <div className="flex flex-col gap-4">
          <CouponVoucher
            headline={headline}
            subtitle={subtitle}
            code={code}
            qrSvg={qrSvg}
            barcodeSvg={barcodeSvg}
            validitySummary={validitySummary}
          />
          <CouponOriginCard batch={batch} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-5 gap-4">
            <KpiCard
              label="Estado"
              value={COUPON_DISPLAY_STATUS_LABEL[displayStatus]}
              detail={
                statusSince
                  ? `desde el ${formatShortDate(statusSince)}`
                  : undefined
              }
            />
            <KpiCard
              label="Usos"
              value={`${formatNumber(coupon.uses_count)} / ${formatNumber(coupon.max_uses)}`}
              detail={redemptions.length === 0 ? "sin redenciones" : undefined}
            />
            <KpiCard
              label="Intentos"
              value={formatNumber(redemptions.length)}
              detail={
                rejectedAttempts > 0
                  ? `${formatNumber(rejectedAttempts)} rechazado${rejectedAttempts === 1 ? "" : "s"}`
                  : undefined
              }
            />
            <KpiCard
              label="Impresiones"
              value={formatNumber(coupon.print_count)}
              detail={
                lastPrintJob
                  ? `${formatShortDate(lastPrintJob.created_at)} · ${COUPON_PRINT_LAYOUT_LABEL[lastPrintJob.layout as CouponPrintLayout]}`
                  : undefined
              }
            />
            <KpiCard
              label="Vence en"
              value={expiryValue}
              detail={
                coupon.valid_to ? formatShortDate(coupon.valid_to) : undefined
              }
            />
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-background p-5 shadow-form-section">
            <CouponDetailTabsNav active={tab} couponId={id} />

            {tab === "eventos" && <EventsTabContent couponId={id} />}
            {tab === "personas" && <PersonasTabContent couponId={id} />}
            {tab === "uso" && (
              <CouponRedemptionsList redemptions={redemptions} />
            )}
            {tab === "reglas" && (
              <RulesTabContent coupon={coupon} batch={batch} />
            )}
          </div>
        </div>
      </div>
    </AppPage>
  )
}

async function RulesTabContent({
  coupon,
  batch,
}: {
  coupon: CouponWithHolder
  batch: CouponBatchListItem
}) {
  const [stores, categories] = await Promise.all([
    listRestrictionStores(),
    listRestrictionCategories(),
  ])
  return (
    <CouponRulesTab
      coupon={coupon}
      batch={batch}
      stores={stores}
      categories={categories}
    />
  )
}
