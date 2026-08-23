import type { StoreStatus, StoreFormat } from "@/types/domain"

export const TIENDA_FORMATO_LABEL: Record<StoreFormat, string> = {
  flagship: "Flagship",
  express: "Express",
  mall: "Mall",
}

export const TIENDA_ESTADO_LABEL: Record<StoreStatus, string> = {
  operando: "Operando",
  bajo_meta: "Bajo meta",
  en_apertura: "En apertura",
  cerrada_temporal: "Cerrada temporal",
}

/** Punto de estado en 04.1 — 'en_apertura' usa el color de marca, no info/success/warning/destructive. */
export const TIENDA_ESTADO_COLOR: Record<StoreStatus, string> = {
  operando: "bg-success",
  bajo_meta: "bg-warning",
  en_apertura: "bg-primary",
  cerrada_temporal: "bg-destructive",
}
