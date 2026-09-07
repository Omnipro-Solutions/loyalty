import {
  Layers,
  Package,
  ShoppingCart,
  Tag,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react"

import type { PromotionType } from "@/types/domain"

/**
 * Cómo se ve un tipo de promoción — ícono, color y etiqueta.
 *
 * Vivía duplicado en `features/promotions/lib/type-icon.ts`, en
 * `features/members/lib/promotion-type.ts` y —la etiqueta— también en
 * `features/promotions/lib/labels.ts`, con el mismo comentario
 * justificándolo: «duplicado a propósito, las features no se importan entre
 * sí». Cierto, pero las dos SÍ pueden importar de `config` — y ahora también
 * lo necesita `components/data/system-log.tsx`, que no pertenece a ninguna
 * feature. Los dos ficheros que solo reexportaban se borraron; sus tres
 * consumidores importan de aquí. `labels.ts` sigue reexportando la etiqueta
 * porque media feature la importa de ahí y esa ruta no aportaba nada
 * cambiarla.
 */
export const PROMOTION_TYPE_ICON: Record<PromotionType, LucideIcon> = {
  cantidad: Layers,
  categoria: Tag,
  segmento: Users,
  carrito: ShoppingCart,
  cupon: TicketPercent,
  bundle: Package,
}

export const PROMOTION_TYPE_COLOR: Record<
  PromotionType,
  { bg: string; fg: string }
> = {
  cantidad: { bg: "bg-avatar-teal-bg", fg: "text-avatar-teal-fg" },
  categoria: { bg: "bg-avatar-indigo-bg", fg: "text-avatar-indigo-fg" },
  segmento: { bg: "bg-avatar-violet-bg", fg: "text-avatar-violet-fg" },
  carrito: { bg: "bg-avatar-coral-bg", fg: "text-avatar-coral-fg" },
  cupon: { bg: "bg-avatar-amber-bg", fg: "text-avatar-amber-fg" },
  bundle: { bg: "bg-avatar-indigo-bg", fg: "text-avatar-indigo-fg" },
}

export const PROMOTION_TYPE_LABEL: Record<PromotionType, string> = {
  cantidad: "Cantidad",
  categoria: "Categoría",
  segmento: "Segmento",
  carrito: "Carrito",
  cupon: "Cupón",
  bundle: "Bundle",
}
