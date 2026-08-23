import {
  Layers,
  Package,
  ShoppingCart,
  Tag,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { TipoPromocion } from "@/types/domain"

export const TIPO_PROMOCION_ICONO: Record<TipoPromocion, LucideIcon> = {
  cantidad: Layers,
  categoria: Tag,
  segmento: Users,
  carrito: ShoppingCart,
  cupon: TicketPercent,
  bundle: Package,
}

export const TIPO_PROMOCION_COLOR: Record<
  TipoPromocion,
  { bg: string; fg: string }
> = {
  cantidad: { bg: "bg-avatar-teal-bg", fg: "text-avatar-teal-fg" },
  categoria: { bg: "bg-avatar-indigo-bg", fg: "text-avatar-indigo-fg" },
  segmento: { bg: "bg-avatar-violet-bg", fg: "text-avatar-violet-fg" },
  carrito: { bg: "bg-avatar-coral-bg", fg: "text-avatar-coral-fg" },
  cupon: { bg: "bg-avatar-amber-bg", fg: "text-avatar-amber-fg" },
  bundle: { bg: "bg-avatar-indigo-bg", fg: "text-avatar-indigo-fg" },
}
