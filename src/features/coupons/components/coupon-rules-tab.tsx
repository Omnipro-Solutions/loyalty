import { formatNumber, formatUSD } from "@/lib/format"

import { restrictionSummary } from "../lib/scope"
import { COUPON_DELIVERY_CHANNEL_LABEL } from "../lib/labels"
import type {
  CatalogOption,
  CouponBatchListItem,
  CouponWithHolder,
} from "../lib/queries"
import { couponDiscountDisplay } from "../lib/recap"
import type { CouponDeliveryChannel } from "@/types/domain"

type CouponRulesTabProps = {
  coupon: CouponWithHolder
  batch: CouponBatchListItem
  stores: CatalogOption[]
  categories: CatalogOption[]
}

/** Figma 13.4 "Reglas y restricciones" — el ámbito vive en la emisión (`coupon_batch`), el descuento materializado vive en el propio código. */
export function CouponRulesTab({
  coupon,
  batch,
  stores,
  categories,
}: CouponRulesTabProps) {
  const { headline, subtitle } = couponDiscountDisplay(coupon, batch)
  const scope = restrictionSummary(
    { store_ids: batch.store_ids, category_ids: batch.category_ids },
    {
      totalStores: stores.length,
      storeNameById: new Map(stores.map((s) => [s.id, s.name])),
      categoryNameById: new Map(categories.map((c) => [c.id, c.name])),
    }
  )
  const channels = batch.delivery_channels as CouponDeliveryChannel[]

  const rows = [
    { label: "Descuento", value: `${headline} · ${subtitle}` },
    {
      label: "Compra mínima",
      value:
        coupon.min_purchase_amount != null
          ? formatUSD(coupon.min_purchase_amount)
          : "Sin mínimo",
    },
    { label: "Usos permitidos", value: `${formatNumber(coupon.max_uses)}` },
    {
      label: "Máx. por persona",
      value: formatNumber(batch.max_coupons_per_person),
    },
    { label: "Tiendas y categorías", value: scope },
    {
      label: "Canal de entrega",
      value:
        channels.length > 0
          ? channels.map((c) => COUPON_DELIVERY_CHANNEL_LABEL[c]).join(" · ")
          : "Sin canal definido",
    },
  ]

  return (
    <dl className="flex flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-4 border-b border-border py-3 text-xs last:border-0"
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="text-right font-medium text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
