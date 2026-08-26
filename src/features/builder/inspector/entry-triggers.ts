import type { BuilderNodeType } from "@/types/domain"

/**
 * Trigger técnico de los bloques de Entrada — el momento exacto en que el
 * motor debería empezar a evaluar el workflow (`docs/builder.md` §2-3:
 * "Solo Entrada tiene Trigger", los demás bloques no vuelven a declararlo).
 *
 * `evento_compra` es el único con más de un momento técnico posible para el
 * mismo evento de negocio (¿al calcular el checkout, al confirmarse el
 * pago, o al completarse la orden?) — por eso es el único con un campo
 * `trigger` real y editable (`SIMPLE_FIELD_SPECS.evento_compra` en
 * `field-specs.ts`). Los otros 4 tipos de Entrada son 1:1 con su trigger:
 * no hay nada que el usuario deba elegir, así que se muestran como dato
 * informativo en el inspector en vez de repetir un selector de una sola
 * opción.
 */
const FIXED_ENTRY_TRIGGERS: Partial<Record<BuilderNodeType, string>> = {
  entra_segmento: "segment.entered",
  canje_cupon: "coupon.redeemed",
  alta_socio: "member.enrolled",
}

/**
 * `fecha_recurrente.tipo` (campo obligatorio, ver `field-specs.ts`) ya
 * distingue exactamente estos 3 casos — el trigger se deriva de ahí en vez
 * de pedir un campo nuevo redundante.
 */
const FECHA_RECURRENTE_TRIGGERS: Record<string, string> = {
  fecha_fija: "schedule.fixed_date",
  cumpleanos: "schedule.birthday",
  recurrente: "schedule.recurring",
}

/**
 * `null` para cualquier tipo que no sea de Entrada, o para uno de Entrada
 * que todavía no tiene el dato necesario para resolver su trigger (ej.
 * `evento_compra` sin `trigger` elegido, `fecha_recurrente` sin `tipo`
 * elegido) — nunca se inventa un trigger por defecto.
 */
export function entryTriggerFor(
  tipo: BuilderNodeType,
  config: Record<string, unknown>
): string | null {
  if (tipo === "evento_compra") {
    return typeof config.trigger === "string" ? config.trigger : null
  }
  if (tipo === "fecha_recurrente") {
    const value = config.tipo
    return typeof value === "string"
      ? (FECHA_RECURRENTE_TRIGGERS[value] ?? null)
      : null
  }
  return FIXED_ENTRY_TRIGGERS[tipo] ?? null
}
