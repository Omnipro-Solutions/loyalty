/**
 * Contrato de la bitácora del sistema: qué módulos existen, cómo se
 * nombran y qué forma tiene una fila. Vive en `config` y no junto a la
 * consulta (`lib/system-log.ts`) porque la tabla es un Client Component:
 * importarlo de `lib` arrastraría `lib/supabase/server` —y con él
 * `next/headers`— al bundle del navegador.
 */
/**
 * Los tres módulos que escriben bitácora transaccional. No es una lista de
 * tablas: `journeys` une el ciclo de vida del workflow con sus corridas,
 * que viven en tablas distintas y para quien lee el log son el mismo hilo.
 */
export const SYSTEM_LOG_MODULES = [
  "promociones",
  "cupones",
  "journeys",
] as const
export type SystemLogModule = (typeof SYSTEM_LOG_MODULES)[number]

export const SYSTEM_LOG_MODULE_LABEL: Record<SystemLogModule, string> = {
  promociones: "Promociones",
  cupones: "Cupones",
  journeys: "Loyalty Builder",
}

/** Cómo se lee el evento de un vistazo, no qué tan grave es el sistema. */
export type SystemLogSeverity = "exito" | "info" | "alerta" | "error"

export type SystemLogEntry = {
  id: string
  modulo: SystemLogModule
  tipo: string
  tipoLabel: string
  severidad: SystemLogSeverity
  titulo: string
  detalle: string | null
  /** La entidad sobre la que ocurrió: la promoción, el lote/cupón o el journey. */
  entidad: string
  entidadHref: string | null
  actor: string
  canal: string | null
  /** Nombre del socio cuando el evento lo tiene — es lo que vuelve auditable una redención puntual. */
  socio: string | null
  motivo: string | null
  metadatos: Record<string, unknown>
  ocurridoEn: string
}
