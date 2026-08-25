import { formatNumber, formatUSD } from "@/lib/format"

import type { CouponBatchValues } from "../schemas"

/** Texto del descuento para la tarjeta de previsualización del vale ("15% de descuento", "$5.00 de descuento", "Producto gratis"). */
export function discountSummary(values: Partial<CouponBatchValues>): string {
  if (!values.discountType) return "—"
  if (values.discountType === "free_product") return "Producto gratis"
  if (values.discountType === "percentage") {
    return `${values.discountValue ?? 0}% de descuento`
  }
  return `${formatUSD(values.discountValue ?? 0)} de descuento`
}

export type BatchDiscountDisplay = { headline: string; subtitle: string }

/**
 * Headline + subtítulo para la tarjeta de previsualización del vale del
 * asistente (Figma 13.3) — combina la forma de `batchDiscountDisplay`
 * (headline/subtitle separados) con la fuente de `discountSummary` (valores
 * del formulario, no de una fila persistida): antes de emitir no hay fila
 * de `coupon_batch` de la que leer. El subtítulo es deliberadamente más
 * simple que el de `batchDiscountDisplay` (sin origen `points_redemption` ni
 * "sin mínimo de compra") — esta tarjeta solo necesita comunicar el
 * descuento, no las reglas de restricción.
 */
export function voucherHeadline(values: Partial<CouponBatchValues>): {
  headline: string
  subtitle: string
} {
  if (values.discountType === "free_product") {
    return { headline: "Producto gratis", subtitle: "regalo al canjear" }
  }
  if (values.discountType === "fixed_amount") {
    return {
      headline: formatUSD(values.discountValue ?? 0),
      subtitle: "de descuento",
    }
  }
  const cap = values.discountCap
  return {
    headline: `${formatNumber(values.discountValue ?? 0)} %`,
    subtitle:
      cap != null ? `de descuento · máximo ${formatUSD(cap)}` : "de descuento",
  }
}

/**
 * Columna "VALOR DEL CUPÓN" del listado de emisiones (Figma 13.1): el
 * subtítulo varía por origen/tipo — canje de puntos muestra la tasa de
 * conversión en vez del tipo de descuento, `free_product` muestra el SKU
 * del regalo, `fixed_amount` es siempre "importe fijo", y `percentage`
 * compone tope y compra mínima (o "sin mínimo de compra" si no hay ninguno).
 */
export function batchDiscountDisplay(
  batch: {
    origin: string
    discount_type: string
    discount_value: number
    discount_cap: number | null
    min_purchase_amount: number | null
    points_rate: number | null
  },
  freeProductSku?: string | null
): BatchDiscountDisplay {
  if (batch.origin === "points_redemption") {
    return {
      headline: formatUSD(batch.discount_value),
      subtitle:
        batch.points_rate != null
          ? `tasa 1 pt = ${formatUSD(batch.points_rate)}`
          : "canje de puntos",
    }
  }
  if (batch.discount_type === "free_product") {
    return {
      headline: "Producto gratis",
      subtitle: freeProductSku ? `SKU ${freeProductSku}` : "—",
    }
  }
  if (batch.discount_type === "fixed_amount") {
    return {
      headline: formatUSD(batch.discount_value),
      subtitle: "importe fijo",
    }
  }
  const parts: string[] = []
  if (batch.discount_cap != null) {
    parts.push(`máx. ${formatUSD(batch.discount_cap)}`)
  }
  if (batch.min_purchase_amount != null) {
    parts.push(`mín. compra ${formatUSD(batch.min_purchase_amount)}`)
  }
  return {
    headline: `${formatNumber(batch.discount_value)}%`,
    subtitle: parts.length > 0 ? parts.join(" · ") : "sin mínimo de compra",
  }
}

/**
 * `batchDiscountDisplay` a partir de un `coupon` (los valores materializados
 * del descuento, que pueden diferir de los del batch) más el `origin`/
 * `points_rate` del batch — ninguna fila por sí sola trae todo lo que la
 * función necesita. Repetido igual en `/cupones/[id]`,
 * `/cupones/[id]/reglas` y `/imprimir/cupones` antes de esta función.
 */
export function couponDiscountDisplay(
  coupon: {
    discount_type: string
    discount_value: number
    discount_cap: number | null
    min_purchase_amount: number | null
  },
  batch: { origin: string; points_rate: number | null },
  freeProductSku?: string | null
): BatchDiscountDisplay {
  return batchDiscountDisplay(
    {
      origin: batch.origin,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_cap: coupon.discount_cap,
      min_purchase_amount: coupon.min_purchase_amount,
      points_rate: batch.points_rate,
    },
    freeProductSku
  )
}

/**
 * Columna "VALOR" del listado de cupones (Figma 13.2) — solo el headline,
 * sin subtítulo (la fila ya tiene su propia columna PUNTOS). Tolera
 * `discount_value` ausente: la vista `coupon_search` gana estas columnas en
 * la migración `20260824160000`, y hasta que esté aplicada en el proyecto
 * remoto enlazado, Supabase simplemente no las devuelve.
 */
export function couponValueDisplay(coupon: {
  discount_type: string
  discount_value: number
}): string {
  if (coupon.discount_type === "free_product") return "Producto gratis"
  if (!Number.isFinite(coupon.discount_value)) return "—"
  if (coupon.discount_type === "fixed_amount") {
    return formatUSD(coupon.discount_value)
  }
  return `${formatNumber(coupon.discount_value)}%`
}
