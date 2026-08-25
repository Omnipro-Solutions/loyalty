import { notFound } from "next/navigation"

import { CouponVoucher } from "@/features/coupons/components/coupon-voucher"
import { PrintPageActions } from "@/features/coupons/components/print-page-actions"
import { PrintVoucherCard } from "@/features/coupons/components/print-voucher-card"
import { getCouponBatchById } from "@/features/coupons/lib/queries"
import { couponDiscountDisplay } from "@/features/coupons/lib/recap"
import { validitySummary } from "@/features/coupons/lib/status"
import { barcodeSvgFor, qrSvgFor } from "@/features/coupons/lib/voucher-svg"
import { createClient } from "@/lib/supabase/server"
import { COUPON_PRINT_LAYOUTS, type CouponPrintLayout } from "@/types/domain"

const MAX_PRINT_CODES = 200

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Fuera de `(app)`: sin `AppShell`, para que `window.print()` mande una
 * hoja A4 limpia. `?emision=&desde=&hasta=&layout=` (Fase 6) — sin nodo de
 * Figma, el layout se compone con el design system existente.
 */
export default async function PrintCouponsPage({
  searchParams,
}: PageProps<"/imprimir/cupones">) {
  const sp = await searchParams
  const batchId = firstValue(sp.emision)
  if (!batchId) notFound()

  const batch = await getCouponBatchById(batchId)
  if (!batch) notFound()

  const layoutParam = firstValue(sp.layout)
  const layout: CouponPrintLayout = COUPON_PRINT_LAYOUTS.includes(
    layoutParam as CouponPrintLayout
  )
    ? (layoutParam as CouponPrintLayout)
    : "grid_8"

  const desde = firstValue(sp.desde) ? Number(firstValue(sp.desde)) : undefined
  const hasta = firstValue(sp.hasta) ? Number(firstValue(sp.hasta)) : undefined

  const supabase = await createClient()
  let query = supabase
    .from("coupon")
    .select(
      "id, code, sequence, valid_to, discount_type, discount_value, discount_cap, min_purchase_amount"
    )
    .eq("batch_id", batchId)
    .neq("status", "cancelled")
    .order("sequence", { ascending: true })
    .limit(MAX_PRINT_CODES)
  if (desde != null) query = query.gte("sequence", desde)
  if (hasta != null) query = query.lte("sequence", hasta)

  const { data: coupons, error } = await query
  if (error) throw error
  if (!coupons || coupons.length === 0) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        No hay códigos para imprimir en el rango elegido.
      </div>
    )
  }

  const vouchers = await Promise.all(
    coupons.map(async (coupon) => {
      const { headline, subtitle } = couponDiscountDisplay(
        coupon,
        batch,
        batch.free_product?.sku
      )
      const qrSvg = await qrSvgFor(coupon.code)
      const barcodeSvg =
        layout === "single_page" ? barcodeSvgFor(coupon.code) : ""
      return {
        id: coupon.id,
        code: coupon.code,
        headline,
        subtitle,
        qrSvg,
        barcodeSvg,
        validity: validitySummary({ valid_to: coupon.valid_to }),
      }
    })
  )

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <PrintPageActions
        batchId={batchId}
        couponIds={vouchers.map((v) => v.id)}
        layout={layout}
      />

      {coupons.length === MAX_PRINT_CODES && (
        <p className="no-print px-6 py-2 text-xs text-warning">
          Se muestran los primeros {MAX_PRINT_CODES} códigos — usa
          ?desde=&hasta= en la URL para imprimir otro rango.
        </p>
      )}

      {layout === "grid_8" ? (
        <div className="grid grid-cols-2 gap-6 p-8 print:grid-rows-4">
          {vouchers.map((v) => (
            <PrintVoucherCard
              key={v.id}
              headline={v.headline}
              subtitle={v.subtitle}
              code={v.code}
              qrSvg={v.qrSvg}
              validitySummary={v.validity}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8 p-8">
          {vouchers.map((v) => (
            <div key={v.id} className="break-after-page">
              <CouponVoucher
                headline={v.headline}
                subtitle={v.subtitle}
                code={v.code}
                qrSvg={v.qrSvg}
                barcodeSvg={v.barcodeSvg}
                validitySummary={v.validity}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
