import {
  type SystemLogEntry,
  type SystemLogModule,
  type SystemLogSeverity,
} from "@/config/system-log"
import { createClient } from "@/lib/supabase/server"

export type {
  SystemLogEntry,
  SystemLogModule,
  SystemLogSeverity,
} from "@/config/system-log"

/**
 * Etiquetas y severidad de cada tipo de evento. Duplican las de
 * los mapas de `labels.ts` de cada feature a propósito y no por
 * descuido: `lib` no puede
 * importar de `features` (CLAUDE.md §2), y subir los tres mapas completos a
 * `lib` para que los compartan arrastraría con ellos media capa de dominio
 * de cada módulo. Se copia lo que este log necesita, que es solo el nombre
 * legible y el tono.
 */
const PROMOTION_EVENTS: Record<string, [string, SystemLogSeverity]> = {
  creada: ["Creada", "info"],
  activada: ["Activada", "exito"],
  pausada: ["Pausada", "alerta"],
  presupuesto_incrementado: ["Presupuesto ampliado", "info"],
  presupuesto_agotado: ["Presupuesto agotado", "error"],
  vencida: ["Vencida", "alerta"],
  cancelada: ["Cancelada", "error"],
  canje: ["Canje", "exito"],
  canje_rechazado: ["Canje rechazado", "error"],
}

const COUPON_EVENTS: Record<string, [string, SystemLogSeverity]> = {
  batch_created: ["Lote creado", "info"],
  authorization_signed: ["Autorización firmada", "info"],
  approval_requested: ["Aprobación solicitada", "info"],
  approval_granted: ["Aprobación concedida", "exito"],
  approval_rejected: ["Aprobación rechazada", "error"],
  approval_revoked: ["Aprobación revocada", "error"],
  approval_withdrawn: ["Aprobación retirada", "alerta"],
  generation_started: ["Generación iniciada", "info"],
  generation_completed: ["Generación completada", "exito"],
  issued: ["Emitido", "info"],
  assigned: ["Asignado", "info"],
  unassigned: ["Desasignado", "alerta"],
  validity_extended: ["Vigencia extendida", "info"],
  redeemed: ["Redimido", "exito"],
  redemption_rejected: ["Redención rechazada", "error"],
  expired: ["Expirado", "alerta"],
  cancelled: ["Cancelado", "error"],
  printed: ["Impreso", "info"],
  exported: ["Exportado", "info"],
}

const WORKFLOW_STATUS_SEVERITY: Record<string, SystemLogSeverity> = {
  activa: "exito",
  borrador: "info",
  suspendida: "alerta",
  finalizada: "alerta",
  cancelada: "error",
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

function str(record: Record<string, unknown>, key: string): string | null {
  const v = record[key]
  return typeof v === "string" && v !== "" ? v : null
}

/**
 * La bitácora de todo el sistema en un solo hilo cronológico. Antes cada
 * módulo tenía la suya y no había ninguna pantalla desde la que ver qué
 * pasó, sin más: un canje de promoción pagado con un cupón que un journey
 * emitió son tres eventos del mismo hecho, y separados en tres pantallas
 * nadie los reconstruye.
 *
 * Se consultan las tres fuentes en paralelo, se normalizan a una fila común
 * y se ordenan en memoria. Es correcto a la escala de este proyecto (unos
 * miles de filas) y evita una vista SQL que habría que mantener en paralelo
 * al esquema de los tres módulos; con volumen de producción esto pediría
 * una vista materializada o una tabla de log propia.
 */
export async function listSystemEvents(
  modulos: SystemLogModule[] = [],
  limit = 300
): Promise<SystemLogEntry[]> {
  const supabase = await createClient()
  const wants = (m: SystemLogModule) =>
    modulos.length === 0 || modulos.includes(m)

  const [promoEvents, couponEvents, workflowEvents] = await Promise.all([
    wants("promociones")
      ? supabase
          .from("promocion_eventos")
          .select(
            `id, tipo, titulo, detalle, actor_etiqueta, canal, codigo_motivo,
             nota_motivo, metadatos, ocurrido_en,
             promocion:promociones!promocion_id(id, nombre),
             socio:members!member_id(nombre)`
          )
          .order("ocurrido_en", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null }),
    wants("cupones")
      ? supabase
          .from("coupon_event")
          .select(
            `id, type, title, detail, actor_label, reason_code, reason_note,
             metadata, occurred_at,
             coupon:coupon!coupon_id(code),
             batch:coupon_batch!batch_id(id, reference, name)`
          )
          .order("occurred_at", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null }),
    wants("journeys")
      ? supabase
          .from("workflow_status_events")
          .select(
            `id, estado_anterior, estado_nuevo, codigo_motivo, nota, ocurrido_en,
             workflow:workflows!workflow_id(id, nombre),
             actor:profiles!actor_id(nombre)`
          )
          .order("ocurrido_en", { ascending: false })
          .limit(limit)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (promoEvents.error) throw promoEvents.error
  if (couponEvents.error) throw couponEvents.error
  // El ciclo de vida del builder es opcional: `workflow_status_events` solo
  // existe tras migrar (ver `hasStatusEventsTable` en el builder). Si falta,
  // el log se queda sin ese módulo en vez de reventar entero.
  const workflowRows = workflowEvents.error ? [] : (workflowEvents.data ?? [])

  const entries: SystemLogEntry[] = []

  for (const row of promoEvents.data ?? []) {
    const [label, severidad] = PROMOTION_EVENTS[row.tipo] ?? [row.tipo, "info"]
    entries.push({
      id: `promo:${row.id}`,
      modulo: "promociones",
      tipo: row.tipo,
      tipoLabel: label,
      severidad,
      titulo: row.titulo,
      detalle: row.detalle,
      entidad: row.promocion?.nombre ?? "—",
      entidadHref: row.promocion?.id
        ? `/promociones/${row.promocion.id}/editar`
        : null,
      actor: row.actor_etiqueta,
      canal: row.canal,
      socio: row.socio?.nombre ?? null,
      motivo: row.nota_motivo ?? row.codigo_motivo,
      metadatos: asRecord(row.metadatos),
      ocurridoEn: row.ocurrido_en,
    })
  }

  for (const row of couponEvents.data ?? []) {
    const [label, severidad] = COUPON_EVENTS[row.type] ?? [row.type, "info"]
    const metadata = asRecord(row.metadata)
    entries.push({
      id: `coupon:${row.id}`,
      modulo: "cupones",
      tipo: row.type,
      tipoLabel: label,
      severidad,
      titulo: row.title,
      detalle: row.detail,
      // El cupón individual es más específico que el lote, así que gana
      // cuando el evento tiene los dos.
      entidad:
        row.coupon?.code ?? row.batch?.name ?? row.batch?.reference ?? "—",
      entidadHref: row.batch?.id ? `/cupones/${row.batch.id}` : null,
      actor: row.actor_label,
      canal: str(metadata, "canal"),
      socio: null,
      motivo: row.reason_note ?? row.reason_code,
      metadatos: metadata,
      ocurridoEn: row.occurred_at,
    })
  }

  for (const row of workflowRows) {
    entries.push({
      id: `journey:${row.id}`,
      modulo: "journeys",
      tipo: row.estado_nuevo,
      tipoLabel: `${row.estado_anterior} → ${row.estado_nuevo}`,
      severidad: WORKFLOW_STATUS_SEVERITY[row.estado_nuevo] ?? "info",
      titulo: "Cambio de estado de la regla",
      detalle: row.nota,
      entidad: row.workflow?.nombre ?? "—",
      entidadHref: row.workflow?.id ? `/journeys/${row.workflow.id}` : null,
      actor: row.actor?.nombre ?? "Sistema",
      canal: null,
      socio: null,
      motivo: row.codigo_motivo,
      metadatos: {
        estado_anterior: row.estado_anterior,
        estado_nuevo: row.estado_nuevo,
      },
      ocurridoEn: row.ocurrido_en,
    })
  }

  return entries
    .sort(
      (a, b) =>
        new Date(b.ocurridoEn).getTime() - new Date(a.ocurridoEn).getTime()
    )
    .slice(0, limit)
}
