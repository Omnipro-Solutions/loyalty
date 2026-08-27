import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/types/database.types"
import { statusFromDb, statusToDb } from "@/lib/publication-status"
import type { BuilderNodeType, WorkflowExclusivity } from "@/types/domain"

/**
 * Capa de compatibilidad con la base ANTERIOR al rediseño del builder.
 *
 * Para qué: las migraciones `20260827130000`–`160000` todavía no están
 * aplicadas en el proyecto Supabase, y sin ellas la base rechaza tres cosas
 * que el builder nuevo necesita —lo comprobé contra el proyecto real:
 *
 *   · `workflow_nodes.tipo = 'evento'`  → viola `workflow_nodes_tipo_check`
 *   · `workflows.estado = 'activa'`     → viola `workflows_estado_check`
 *   · `workflow_status_events`          → la tabla no existe
 *
 * y `workflows` no tiene todavía `vigente_desde`, `vigente_hasta`,
 * `prioridad`, `exclusividad` ni `grupo_exclusividad`.
 *
 * Qué hace: traduce en los dos sentidos, para que el editor funcione y se
 * puedan crear flujos contra el esquema viejo. Es **temporal por diseño**:
 * `hasV2Schema()` detecta las columnas nuevas en caliente, así que en cuanto
 * las migraciones se apliquen esta capa se apaga sola y deja de tocar nada.
 * Cuando eso pase, este archivo y su uso se borran (ver `MIGRACIONES.md`).
 *
 * Lo que NO puede hacer, y hay que saberlo antes de usarla:
 *
 * · **La vigencia, la prioridad y la exclusividad no se guardan.** No hay
 *   columna donde ponerlas ni un jsonb libre en `workflows` que sirva de
 *   escondite. Se leen con los valores por defecto y editarlas no persiste.
 * · **La bitácora de estados no se guarda.** Sin tabla, los cambios de
 *   estado ocurren pero no dejan registro. Se pierde justo la trazabilidad
 *   que el ciclo de vida nuevo venía a dar.
 *
 * Ninguna de las dos rompe "crear un flujo", que es para lo que existe esto.
 */

type Client = SupabaseClient<Database>

// ── Estado ────────────────────────────────────────────────────────────────
//
// La traducción vive en `lib/publication-status.ts` porque Audiencias
// también lee el estado de las reglas y las features no se importan entre
// sí. Se reexporta aquí para que quien trabaje en el builder encuentre toda
// la compatibilidad en un solo archivo.
export { statusFromDb, statusToDb }

// ── Tipo de bloque ────────────────────────────────────────────────────────
//
// Los tipos nuevos no tienen valor legal en el `check` viejo, así que se
// guardan bajo un tipo PORTADOR y el tipo real viaja en `config.__tipo`,
// que es jsonb sin restricciones. El portador se elige del mismo grupo para
// que cualquier lectura directa de la tabla (analítica, SQL a mano) siga
// viendo algo coherente en vez de un tipo de otra familia.
//
// La decodificación es total y determinista —`config.__tipo` gana siempre—,
// y la hace `20260827130000_builder_evento_unico` en cuanto se aplique. Por
// eso el marcador es un dato, no una convención de nombres: un `update` de
// una línea lo deshace sin adivinar.
const CARRIER_TYPE: Partial<Record<BuilderNodeType, string>> = {
  evento: "evento_compra",
  actualizar_cliente: "webhook_saliente",
  cambiar_segmento: "webhook_saliente",
  emitir_evento: "webhook_saliente",
  union: "esperar",
}

/** Marcador con el tipo real, dentro de `config`. */
const TYPE_MARKER = "__tipo"

export type NodeRow = {
  tipo: string
  config: Record<string, unknown>
}

/**
 * Fila → dominio. Un nodo escrito por esta capa vuelve con su tipo real y
 * sin el marcador, así que el resto de la app nunca ve la codificación.
 *
 * Los nodos de Entrada VIEJOS (los que ya estaban en la base antes de todo
 * esto) también se traducen aquí, con la misma tabla que usa la migración:
 * así el editor los abre como bloques `evento` en vez de romperse con un
 * tipo que `BUILDER_BLOCKS` ya no conoce.
 */
export function nodeFromDb(row: NodeRow): {
  tipo: BuilderNodeType
  config: Record<string, unknown>
} {
  const marker = row.config?.[TYPE_MARKER]
  if (typeof marker === "string") {
    const config = { ...row.config }
    delete config[TYPE_MARKER]
    return { tipo: marker as BuilderNodeType, config }
  }

  const legacy = LEGACY_ENTRY_TO_EVENT[row.tipo]
  if (legacy) {
    return {
      tipo: "evento",
      config: { ...legacy(row.config), ...row.config },
    }
  }
  return { tipo: row.tipo as BuilderNodeType, config: row.config ?? {} }
}

/** Dominio → fila. `legacy: false` devuelve el nodo intacto. */
export function nodeToDb(
  tipo: BuilderNodeType,
  config: Record<string, unknown>,
  legacy: boolean
): NodeRow {
  const carrier = legacy ? CARRIER_TYPE[tipo] : undefined
  if (!carrier) return { tipo, config }
  return { tipo: carrier, config: { ...config, [TYPE_MARKER]: tipo } }
}

/**
 * Los 7 tipos de Entrada que se colapsaron en `evento`, con el evento del
 * catálogo que les corresponde. Misma tabla que
 * `20260827130000_builder_evento_unico`: si divergen, un flujo se vería
 * distinto antes y después de migrar, que es la clase de discrepancia más
 * difícil de detectar.
 */
const LEGACY_ENTRY_TO_EVENT: Record<
  string,
  (config: Record<string, unknown>) => Record<string, unknown>
> = {
  evento_compra: (config) => ({
    dominio: "compra",
    evento_id:
      typeof config.trigger === "string" ? config.trigger : "order.completed",
    modo_disparo: "al_ocurrir",
  }),
  entra_segmento: () => ({
    dominio: "segmentacion",
    evento_id: "segment.entered",
    modo_disparo: "al_ocurrir",
  }),
  canje_cupon: () => ({
    dominio: "cupon",
    evento_id: "coupon.redeemed",
    modo_disparo: "al_ocurrir",
  }),
  alta_socio: () => ({
    dominio: "cliente",
    evento_id: "member.enrolled",
    modo_disparo: "al_ocurrir",
  }),
  devolucion: () => ({
    dominio: "compra",
    evento_id: "order.returned",
    modo_disparo: "al_ocurrir",
  }),
  fecha_recurrente: (config) => ({
    dominio: "tiempo",
    evento_id:
      config.tipo === "fecha_fija"
        ? "schedule.fixed_date"
        : config.tipo === "cumpleanos"
          ? "schedule.birthday"
          : "schedule.recurring",
    modo_disparo: "programado",
    cadencia: typeof config.cadencia === "string" ? config.cadencia : "diaria",
    hora_ejecucion: "09:00",
    zona_horaria:
      typeof config.zona_horaria === "string"
        ? config.zona_horaria
        : "America/Bogota",
  }),
  cambio_nivel_entrada: (config) => ({
    dominio: "cliente",
    evento_id:
      config.direccion === "baja"
        ? "member.tier_downgraded"
        : "member.tier_upgraded",
    modo_disparo: "al_ocurrir",
  }),
}

// ── Ciclo de vida sin columnas ────────────────────────────────────────────

/**
 * Lo que se muestra cuando las columnas de vigencia/prioridad no existen.
 * Valores neutros a propósito: una prioridad inventada distinta por regla
 * daría la impresión de que alguien las ordenó.
 */
export const LIFECYCLE_FALLBACK = {
  vigente_desde: "2027-01-01",
  vigente_hasta: null as string | null,
  prioridad: 10,
  exclusividad: "acumulable" as WorkflowExclusivity,
  grupo_exclusividad: null as string | null,
}

// ── Detección del esquema ─────────────────────────────────────────────────

/**
 * `true` si la base ya tiene el esquema nuevo. Se resuelve con una consulta
 * mínima a una columna que solo existe después de migrar, y se cachea por
 * proceso: es una propiedad del despliegue, no de la petición, y preguntarlo
 * en cada carga añadiría un viaje de red a cada render del editor.
 *
 * El caché es la razón de que aplicar las migraciones pida reiniciar el
 * servidor de desarrollo (o esperar al siguiente arranque): no hay coste en
 * dejarlo así, y refrescarlo solo sería relevante en el instante exacto de
 * la migración.
 */
let v2SchemaCache: boolean | null = null

export async function hasV2Schema(supabase: Client): Promise<boolean> {
  if (v2SchemaCache !== null) return v2SchemaCache
  const { error } = await supabase
    .from("workflows")
    .select("vigente_desde")
    .limit(1)
  // `42703` = undefined_column. Cualquier otro error (red, permisos) NO
  // debe interpretarse como "la base es vieja": eso escribiría datos
  // codificados en una base ya migrada, que es el único daño real que esta
  // capa podría causar. Ante la duda, se asume migrada.
  v2SchemaCache = !(error && error.code === "42703")
  return v2SchemaCache
}

/** Para los tests y para forzar una relectura tras migrar sin reiniciar. */
export function resetSchemaCache(): void {
  v2SchemaCache = null
}

/**
 * `true` si la tabla de bitácora existe. Separado de `hasV2Schema` porque
 * un fallo aquí no debe impedir publicar: perder el registro es malo, no
 * poder publicar es peor.
 */
export async function hasStatusEventsTable(supabase: Client): Promise<boolean> {
  const { error } = await supabase
    .from("workflow_status_events")
    .select("id")
    .limit(1)
  return !error
}

/** Los campos de ciclo de vida que sí se pueden escribir, según el esquema. */
export function lifecycleUpdate(
  values: {
    vigente_desde?: string
    vigente_hasta?: string | null
  },
  legacy: boolean
): Record<string, Json> {
  if (legacy) return {}
  const update: Record<string, Json> = {}
  if (values.vigente_desde !== undefined) {
    update.vigente_desde = values.vigente_desde
  }
  if (values.vigente_hasta !== undefined) {
    update.vigente_hasta = values.vigente_hasta
  }
  return update
}
