import type { SalesChannel } from "@/types/domain"

/**
 * Dónde pasó la venta, dicho como el lugar y no como el sistema.
 *
 * Es un copy distinto del de `features/members/lib/labels.ts`
 * (`SALES_CHANNEL_LABEL`, que dice "POS"): ahí el canal es el sistema que
 * registró el movimiento, y aquí es el sitio donde estuvo la persona. Vive
 * en `config` para que lo compartan la bitácora y el modal de detalle
 * (`components/data`, que no puede importar de `features` — CLAUDE.md §2)
 * en vez de tener cada uno su copia, que es como se desincronizan.
 */
export const SALES_CHANNEL_PLACE_LABEL: Record<SalesChannel, string> = {
  pos: "Tienda física",
  ecommerce: "E-commerce",
  app: "App móvil",
}

/** El canal llega como `text` desde la base: si no es uno de los tres, se dice tal cual en vez de mentir. */
export function salesChannelPlaceLabel(canal: string): string {
  return SALES_CHANNEL_PLACE_LABEL[canal as SalesChannel] ?? canal
}
