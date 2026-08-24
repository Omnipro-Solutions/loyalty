import { formatUSD } from "@/lib/format"

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
