import type {
  ChannelScope,
  ApplyTo,
  ConditionField,
  ConditionCombinator,
  BenefitType,
  PromotionType,
  UsagePeriod,
} from "@/types/domain"

/** Igual que `features/team` `CHANNEL_SCOPE_LABEL` — duplicado a propósito (features aisladas, CLAUDE.md §2). */
export const CHANNEL_SCOPE_LABEL: Record<ChannelScope, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  pos_ecommerce: "POS + E-commerce",
}

/** Prefijo del subtítulo en 06.1 ("Cantidad · todas las tiendas", "Cupón · nuevos clientes"…). */
export const PROMOTION_TYPE_LABEL: Record<PromotionType, string> = {
  cantidad: "Cantidad",
  categoria: "Categoría",
  segmento: "Segmento",
  carrito: "Carrito",
  cupon: "Cupón",
  bundle: "Bundle",
}

export const CONDITION_FIELD_LABEL: Record<ConditionField, string> = {
  categoria: "Categoría del producto",
  tienda: "Tienda",
  segmento: "Segmento del cliente",
  monto_carrito: "Monto del carrito",
}

/** Operador implícito por campo (07.1: cada campo del mock trae siempre el mismo operador). */
export const CONDITION_FIELD_OPERATOR: Record<ConditionField, string> = {
  categoria: "pertenece a",
  tienda: "está en",
  segmento: "es igual a",
  monto_carrito: "mayor o igual a",
}

export const CONDITION_COMBINATOR_LABEL: Record<ConditionCombinator, string> = {
  todas: "Coincidir TODAS (AND)",
  alguna: "Coincidir ALGUNA (OR)",
}

export const BENEFIT_TYPE_LABEL: Record<BenefitType, string> = {
  descuento_porcentual: "Descuento porcentual",
  descuento_monto_fijo: "Descuento de monto fijo",
  envio_gratis: "Envío gratis",
  producto_gratis: "Producto gratis (2x1, 3x2…)",
  precio_fijo_bundle: "Precio fijo de bundle",
}

export const APPLY_TO_LABEL: Record<ApplyTo, string> = {
  subtotal_carrito: "Subtotal del carrito",
  producto: "Producto",
  envio: "Costo de envío",
}

export const USAGE_PERIOD_LABEL: Record<UsagePeriod, string> = {
  sin_limite: "Sin límite",
  dia: "por día",
  semana: "por semana",
  mes: "por mes",
}

export const PRIORITY_BAND_LABEL: Record<"alta" | "media" | "baja", string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
}

export function priorityBand(priority: number): "alta" | "media" | "baja" {
  if (priority >= 8) return "alta"
  if (priority >= 4) return "media"
  return "baja"
}
