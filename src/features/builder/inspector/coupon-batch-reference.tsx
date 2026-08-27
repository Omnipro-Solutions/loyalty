import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import type { CouponBatchSummary } from "@/features/builder/canvas/queries"
import { formatDate, formatNumber, formatUSD } from "@/lib/format"
import type { CouponBatchStatus, CouponDiscountType } from "@/types/domain"

/**
 * Datos de la emisión elegida en `emitir_cupon`, en solo lectura.
 *
 * El bloque no vuelve a preguntar descuento, moneda ni usos: se materializan
 * en cada cupón al generarlo (ver el comentario de `coupon.discount_type` en
 * la migración de cupones). Mostrarlos aquí evita tener que abrir Cupones
 * para saber qué va a emitir la regla, y deja claro dónde se cambian — así la
 * regla nunca contradice a la emisión.
 *
 * Las etiquetas están duplicadas de `features/coupons` a propósito: las
 * features no se importan entre sí (CLAUDE.md §2), mismo criterio que
 * `listCouponBatchesForBuilder`.
 */

const DISCOUNT_LABEL: Record<CouponDiscountType, (value: number) => string> = {
  percentage: (v) => `${formatNumber(v)}%`,
  fixed_amount: (v) => formatUSD(v),
  free_product: () => "Producto gratis",
}

const BATCH_STATUS_LABEL: Record<CouponBatchStatus, string> = {
  draft: "Borrador",
  pending_approval: "Pendiente de aprobación",
  generating: "Generando",
  issued: "Emitida",
  closed: "Cerrada",
  cancelled: "Cancelada",
}

const DELIVERY_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  print: "Impresión",
}

export function CouponBatchReference({
  batch,
}: {
  /** `undefined` mientras no haya emisión elegida — el campo obligatorio ya lo avisa. */
  batch: CouponBatchSummary | undefined
}) {
  if (!batch) return null

  const rows: { label: string; value: string }[] = [
    {
      label: "Valor",
      value: DISCOUNT_LABEL[batch.discountType](batch.discountValue),
    },
    {
      label: "Vigencia",
      value: batch.validTo
        ? `${formatDate(batch.validFrom)} – ${formatDate(batch.validTo)}`
        : `Desde ${formatDate(batch.validFrom)} · sin fin`,
    },
    {
      label: "Usos por cupón",
      value: formatNumber(batch.maxUsesPerCoupon),
    },
    {
      label: "Por generar",
      value: formatNumber(batch.remaining),
    },
    {
      label: "Entrega",
      value: batch.deliveryChannels.length
        ? batch.deliveryChannels.map((c) => DELIVERY_LABEL[c] ?? c).join(" + ")
        : "Sin canal declarado",
    },
  ]

  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-muted p-3.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
          {batch.name}
        </p>
        <Badge variant="neutral">{BATCH_STATUS_LABEL[batch.status]}</Badge>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {batch.reference}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[10px] leading-[13px] tracking-[0.3px] text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="text-[12px] font-medium text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-muted-foreground">
        El bloque no redefine estos valores: los aporta la emisión.{" "}
        <Link href="/cupones" className="font-medium text-primary">
          Editar en Cupones
        </Link>
      </p>
    </div>
  )
}
