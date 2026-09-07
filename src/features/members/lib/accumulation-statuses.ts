/**
 * En qué punto está una acumulación. No es el estado de la promoción: es el
 * del SOCIO dentro de ella, y está redactado para responder una sola
 * pregunta — «¿qué le digo a esta persona?».
 *
 * El orden de la tupla es el de la respuesta: primero lo que hay que hacer,
 * después lo que salió bien, al final lo que se perdió.
 */
export const ACCUMULATION_STATUSES = [
  /** Completó el ciclo y no se ha llevado la pieza. Es lo único que exige actuar. */
  "por_reclamar",
  /** Ciclo a medias y la vigencia se acaba: aún llega si compra ya. */
  "por_vencer",
  /** Ciclo a medias, con holgura. */
  "en_curso",
  /** Alcanzó el beneficio y lo recibió. Cerrado y bien cerrado. */
  "completada",
  /** Se acabó el tiempo sin alcanzarlo: esas piezas ya no convierten. */
  "vencida",
  /** La promoción se retiró antes de que llegara. No fue cosa suya. */
  "interrumpida",
  /** Sigue vigente pero su presupuesto se agotó: no hay con qué pagarle. */
  "sin_presupuesto",
] as const
export type AccumulationStatus = (typeof ACCUMULATION_STATUSES)[number]
