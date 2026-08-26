import {
  BanknoteArrowUp,
  CalendarX,
  CircleCheck,
  CirclePause,
  CircleSlash,
  CircleX,
  FilePen,
  FilePlus2,
  Flag,
  PiggyBank,
  Ticket,
  type LucideIcon,
} from "lucide-react"

import type { PromotionEventType } from "@/types/domain"

/** Mismo criterio que `PROMOTION_TYPE_ICON` (type-icon.ts): el ícono vive junto al color, no repartido por los componentes que lo pintan. */
export const PROMOTION_EVENT_ICON: Record<PromotionEventType, LucideIcon> = {
  creada: FilePlus2,
  editada: FilePen,
  activada: CircleCheck,
  inactivada: CirclePause,
  finalizada: Flag,
  presupuesto_incrementado: BanknoteArrowUp,
  presupuesto_agotado: PiggyBank,
  vencida: CalendarX,
  cancelada: CircleSlash,
  canje: Ticket,
  canje_rechazado: CircleX,
}

export type PromotionEventBadgeVariant =
  "neutral" | "success" | "warning" | "error" | "info"

export const PROMOTION_EVENT_BADGE_VARIANT: Record<
  PromotionEventType,
  PromotionEventBadgeVariant
> = {
  creada: "neutral",
  editada: "neutral",
  activada: "success",
  inactivada: "warning",
  finalizada: "info",
  presupuesto_incrementado: "info",
  presupuesto_agotado: "warning",
  vencida: "neutral",
  cancelada: "error",
  canje: "success",
  canje_rechazado: "error",
}
