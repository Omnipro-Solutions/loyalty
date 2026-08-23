import type {
  AlcanceCanal,
  AplicarSobre,
  CampoCondicion,
  CombinadorCondicion,
  TipoBeneficio,
  TipoPromocion,
  UsosPeriodo,
} from "@/types/domain"

/** Igual que `features/equipo` `ALCANCE_CANAL_LABEL` — duplicado a propósito (features aisladas, CLAUDE.md §2). */
export const CANAL_APLICACION_LABEL: Record<AlcanceCanal, string> = {
  pos: "POS",
  ecommerce: "E-commerce",
  pos_ecommerce: "POS + E-commerce",
}

/** Prefijo del subtítulo en 06.1 ("Cantidad · todas las tiendas", "Cupón · nuevos clientes"…). */
export const TIPO_PROMOCION_LABEL: Record<TipoPromocion, string> = {
  cantidad: "Cantidad",
  categoria: "Categoría",
  segmento: "Segmento",
  carrito: "Carrito",
  cupon: "Cupón",
  bundle: "Bundle",
}

export const CAMPO_CONDICION_LABEL: Record<CampoCondicion, string> = {
  categoria: "Categoría del producto",
  tienda: "Tienda",
  segmento: "Segmento del cliente",
  monto_carrito: "Monto del carrito",
}

/** Operador implícito por campo (07.1: cada campo del mock trae siempre el mismo operador). */
export const CAMPO_CONDICION_OPERADOR: Record<CampoCondicion, string> = {
  categoria: "pertenece a",
  tienda: "está en",
  segmento: "es igual a",
  monto_carrito: "mayor o igual a",
}

export const COMBINADOR_CONDICION_LABEL: Record<CombinadorCondicion, string> = {
  todas: "Coincidir TODAS (AND)",
  alguna: "Coincidir ALGUNA (OR)",
}

export const TIPO_BENEFICIO_LABEL: Record<TipoBeneficio, string> = {
  descuento_porcentual: "Descuento porcentual",
  descuento_monto_fijo: "Descuento de monto fijo",
  envio_gratis: "Envío gratis",
  producto_gratis: "Producto gratis (2x1, 3x2…)",
  precio_fijo_bundle: "Precio fijo de bundle",
}

export const APLICAR_SOBRE_LABEL: Record<AplicarSobre, string> = {
  subtotal_carrito: "Subtotal del carrito",
  producto: "Producto",
  envio: "Costo de envío",
}

export const USOS_PERIODO_LABEL: Record<UsosPeriodo, string> = {
  sin_limite: "Sin límite",
  dia: "por día",
  semana: "por semana",
  mes: "por mes",
}

export const PRIORIDAD_BANDA_LABEL: Record<"alta" | "media" | "baja", string> =
  {
    alta: "Alta",
    media: "Media",
    baja: "Baja",
  }

export function bandaPrioridad(prioridad: number): "alta" | "media" | "baja" {
  if (prioridad >= 8) return "alta"
  if (prioridad >= 4) return "media"
  return "baja"
}
