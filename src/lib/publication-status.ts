import {
  PUBLICATION_STATUSES,
  SELECTABLE_PUBLICATION_STATUSES,
  STATUS_CHANGE_REASONS_REQUIRING_NOTE,
  type PublicationStatus,
  type SelectablePublicationStatus,
  type StatusChangeReason,
} from "@/types/domain"

/**
 * El ciclo de vida de todo lo que se publica en el portal —promociones y
 * reglas del builder—, en un solo sitio.
 *
 * Vive en `lib/` y no dentro de una feature porque las dos lo necesitan y
 * `features` están aisladas entre sí (ver `eslint.config.mjs`): antes esto
 * era `features/promotions/lib/status.ts` y el builder tenía su propio
 * vocabulario (`publicado`/`pausado`/`archivado`) para exactamente el mismo
 * ciclo. Un solo juego de estados significa que quien aprendió a publicar
 * una promoción ya sabe publicar una regla.
 */

/** Único estado que no se guarda: se deriva de 'activa' + las fechas de vigencia. */
export type ValidityStatus = "programada"

/** Lo que se muestra en los listados y en la tarjeta de estado. */
export type DisplayStatus = PublicationStatus | ValidityStatus

export type Validity = {
  vigente_desde: string
  vigente_hasta: string | null
}

/** Día calendario en UTC como entero comparable — evita que la hora del día o la zona horaria muevan el límite. */
function dateOnly(value: string | Date): number {
  const d = typeof value === "string" ? new Date(value) : value
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * `borrador`, `inactiva` y `finalizada` son decisiones explícitas del
 * operador y se muestran tal cual. Solo `activa` se cruza con las fechas
 * — así `programada`/`finalizada` por vigencia no pueden quedar
 * desincronizadas de la columna.
 */
export function publicationStatus(
  entity: { estado: string } & Validity,
  now: Date = new Date()
): DisplayStatus {
  if (entity.estado !== "activa") return entity.estado as PublicationStatus
  const today = dateOnly(now)
  const start = dateOnly(entity.vigente_desde)
  const end = entity.vigente_hasta ? dateOnly(entity.vigente_hasta) : null
  if (start > today) return "programada"
  if (end !== null && end < today) return "finalizada"
  return "activa"
}

/**
 * Solo se edita mientras es un borrador. En cuanto se publica (cualquier
 * otro estado) sus campos pasan a ser de solo lectura y lo único que se
 * puede cambiar es el propio estado — de ahí que ningún estado publicado
 * pueda volver a `borrador` (ver `ALLOWED_STATUS_TRANSITIONS`).
 */
export function isLocked(entity: { estado: string }): boolean {
  return entity.estado !== "borrador"
}

/**
 * Transiciones permitidas al cambiar el estado de algo ya creado. Regla
 * única: entre estados publicados se puede ir a cualquiera, pero ninguno
 * vuelve a `borrador` — volver reabriría la edición de algo que ya estuvo
 * publicado, y lo que el motor ya evaluó no se puede des-evaluar.
 *
 * Al CREAR no aplica: ahí los cuatro estados son elegibles como estado
 * inicial (campo "Estado" del paso Resumen / del diálogo de publicar).
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  PublicationStatus,
  readonly PublicationStatus[]
> = {
  // "activa" es el destino que pide quien publica; el servidor SIEMPRE lo
  // sustituye por `pendiente_aprobacion` y abre una solicitud (ver
  // `guard_promotion_publication_transition` /
  // `guard_workflow_publication_transition`, migración
  // `20260901100000_aprobacion_obligatoria.sql`). Esta tabla no modela esa
  // sustitución porque no es una transición que el cliente pueda elegir.
  // Vale igual para `inactiva → activa` y `finalizada → activa`: reactivar
  // también pasa por la firma de otra persona.
  borrador: ["activa", "inactiva", "finalizada"],
  // Sin salida manual: mientras espera aprobación, la única acción posible
  // es retirar la solicitud desde la bandeja de aprobaciones, no un cambio
  // de estado genérico.
  pendiente_aprobacion: [],
  activa: ["inactiva", "finalizada"],
  inactiva: ["activa", "finalizada"],
  finalizada: ["activa", "inactiva"],
}

export function canTransitionStatus(
  from: PublicationStatus,
  to: PublicationStatus
): boolean {
  return from === to || ALLOWED_STATUS_TRANSITIONS[from].includes(to)
}

export const PUBLICATION_STATUS_LABEL: Record<DisplayStatus, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente de aprobación",
  activa: "Activa",
  programada: "Programada",
  inactiva: "Inactiva",
  finalizada: "Finalizada",
}

/** Qué significa cada estado, para el diálogo de cambio: el operador elige sobre la consecuencia, no sobre la palabra. */
export const PUBLICATION_STATUS_DESCRIPTION: Record<PublicationStatus, string> =
  {
    borrador: "Aún no publicada — se puede seguir editando.",
    pendiente_aprobacion:
      "Esperando que otra persona la apruebe — bloqueada para edición.",
    // Pedir `activa` ya no la deja activa: abre una solicitud y la deja en
    // `pendiente_aprobacion` hasta que otra persona la apruebe
    // (`20260901100000_aprobacion_obligatoria.sql`). La descripción dice la
    // consecuencia real, no el nombre del estado que se eligió.
    activa:
      "Pasa a revisión: se activa sola en cuanto otra persona apruebe la solicitud.",
    inactiva: "Publicada pero suspendida — el motor la ignora.",
    finalizada: "Cerrada: no vuelve a aplicarse mientras siga en este estado.",
  }

/** Verbo en el botón, sustantivo en la insignia. `pendiente_aprobacion` nunca aparece en un botón (ver `ALLOWED_STATUS_TRANSITIONS`) — el valor existe solo para que el mapa sea exhaustivo. */
export const TRANSITION_VERB: Record<PublicationStatus, string> = {
  borrador: "Volver a borrador",
  pendiente_aprobacion: "Enviar a aprobación",
  activa: "Reactivar",
  inactiva: "Inactivar",
  finalizada: "Finalizar",
}

/** Cómo se lee el cambio en la bitácora, ya ocurrido. */
export const STATUS_EVENT_LABEL: Record<PublicationStatus, string> = {
  borrador: "Devuelta a borrador",
  pendiente_aprobacion: "Enviada a aprobación",
  activa: "Activada",
  inactiva: "Inactivada",
  finalizada: "Finalizada",
}

export const STATUS_CHANGE_REASON_LABEL: Record<StatusChangeReason, string> = {
  decision_comercial: "Decisión comercial",
  presupuesto: "Presupuesto",
  error_configuracion: "Error de configuración",
  bajo_rendimiento: "Bajo rendimiento",
  fin_de_campana: "Fin de campaña",
  otro: "Otro (especificar)",
}

/**
 * El motivo es lo que hace auditable la bitácora. `otro` no explica nada
 * por sí solo, así que exige la nota — misma regla que
 * `coupon_cancel_note_required` en cupones.
 */
export function statusChangeNeedsNote(reason: StatusChangeReason): boolean {
  return STATUS_CHANGE_REASONS_REQUIRING_NOTE.includes(reason)
}

/**
 * Traducción con el vocabulario ANTERIOR del builder
 * (`publicado`/`pausado`/`archivado`), para las bases donde
 * `20260827140000_builder_ciclo_vida` todavía no se aplicó.
 *
 * Vive aquí y no en `features/builder` porque Audiencias también lee el
 * estado de las reglas (`listLinkedJourneys`) y las features no se importan
 * entre sí. Es una biyección exacta, así que no pierde nada; desaparece
 * cuando la migración esté aplicada en todos los entornos.
 */
// `pendiente_aprobacion` no tiene equivalente en el vocabulario viejo: solo
// puede existir en una base donde ya corrió
// `20260831090000_promociones_journeys_doble_aprobacion.sql`, que a su vez
// exige que `20260827140000_builder_ciclo_vida.sql` (la que introduce este
// vocabulario) ya estuviera aplicada — así que `legacy` nunca es `true`
// cuando este valor está en juego. Se mapea a sí mismo solo para que el
// `Record` sea exhaustivo, no porque el caso vaya a ocurrir.
const STATUS_TO_LEGACY: Record<PublicationStatus, string> = {
  borrador: "borrador",
  pendiente_aprobacion: "pendiente_aprobacion",
  activa: "publicado",
  inactiva: "pausado",
  finalizada: "archivado",
}

const STATUS_FROM_LEGACY: Record<string, PublicationStatus> = {
  borrador: "borrador",
  publicado: "activa",
  pausado: "inactiva",
  archivado: "finalizada",
  // Una base ya migrada devuelve los valores nuevos tal cual. Sin la entrada
  // de `pendiente_aprobacion` aquí, `statusFromDb` la leería como
  // `borrador` por el `?? "borrador"` de abajo — y una regla esperando
  // aprobación volvería a ser editable.
  pendiente_aprobacion: "pendiente_aprobacion",
  activa: "activa",
  inactiva: "inactiva",
  finalizada: "finalizada",
}

/** Lo que diga la columna → el vocabulario de la app. */
export function statusFromDb(estado: string): PublicationStatus {
  return STATUS_FROM_LEGACY[estado] ?? "borrador"
}

/** El vocabulario de la app → lo que la columna acepta hoy. */
export function statusToDb(estado: PublicationStatus, legacy: boolean): string {
  return legacy ? STATUS_TO_LEGACY[estado] : estado
}

export { PUBLICATION_STATUSES, SELECTABLE_PUBLICATION_STATUSES }
export type {
  PublicationStatus,
  SelectablePublicationStatus,
  StatusChangeReason,
}
