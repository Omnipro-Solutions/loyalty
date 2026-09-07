import type { AccumulationStatus } from "./accumulation-statuses"

/**
 * Copy de cada estado, compartido por la tarjeta de la ficha, la tabla de la
 * pestaña y el CSV — para que la misma acumulación se llame igual en los
 * tres sitios. Sin funciones ni formateadores: lo importa también el cliente.
 */
export const ACCUMULATION_STATUS_LABEL: Record<AccumulationStatus, string> = {
  por_reclamar: "Por reclamar",
  por_vencer: "Por vencer",
  en_curso: "En curso",
  completada: "Completada",
  vencida: "Vencida",
  interrumpida: "Promoción retirada",
  sin_presupuesto: "Sin presupuesto",
}
