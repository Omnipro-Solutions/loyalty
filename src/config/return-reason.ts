import type { ReturnReason } from "@/types/domain"

/**
 * Cómo se lee un motivo de devolución. Vive en `config` y no junto a una
 * feature porque lo comparten la bitácora (`components/data`, que no puede
 * importar de `features` — CLAUDE.md §2) y la ficha del socio, igual que
 * `config/promotion-type.ts`.
 *
 * El copy dice qué pasó, no cómo se llama el campo: «Reacción adversa» es lo
 * que el regente escribe en el acta, no "adverse_event".
 */
export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  producto_defectuoso: "Producto defectuoso",
  producto_vencido: "Producto vencido",
  no_era_lo_esperado: "No era lo esperado",
  error_en_pedido: "Error en el pedido",
  reaccion_adversa: "Reacción adversa",
  arrepentimiento: "Cambio de decisión",
}

/**
 * Los dos motivos que obligan a mirar el lote, no solo a devolver el dinero.
 * Se marcan aparte en la bitácora: una reacción adversa perdida entre
 * "cambió de decisión" es un problema de farmacovigilancia, no de caja.
 */
export const RETURN_REASONS_SANITARY: readonly ReturnReason[] = [
  "producto_vencido",
  "reaccion_adversa",
]
