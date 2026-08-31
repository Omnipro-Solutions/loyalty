import type { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database.types"
import type {
  PromotionEventType,
  PromotionPublicationStatus,
} from "@/types/domain"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/** Estado → evento de bitácora que lo registra. `borrador` no aparece: nada escribe ese estado a través de `logPromotionEvent` (ver `publish-gate.ts`). */
export const STATUS_EVENT_TYPE: Record<
  Exclude<PromotionPublicationStatus, "borrador">,
  PromotionEventType
> = {
  pendiente_aprobacion: "aprobacion_solicitada",
  activa: "activada",
  inactiva: "inactivada",
  finalizada: "finalizada",
}

/**
 * Inserta una fila en `promocion_eventos` — la bitácora que alimenta
 * "Historial" en la vista de la promoción y "Logs" en el panel.
 *
 * Vive aparte de `promotions.ts` (que la definía antes) para que
 * `publish-gate.ts` pueda usarla sin crear un import circular entre los dos
 * (`promotions.ts` también usa `publish-gate.ts`).
 *
 * Nunca hace fallar la acción que la llama: si la promoción se guardó pero
 * el evento no, perder la traza es mejor que dejar creer que el cambio no
 * ocurrió (la tabla es append-only, así que un reintento tampoco podría
 * corregirlo).
 */
export async function logPromotionEvent(
  ctx: {
    supabase: SupabaseClient
    orgId: string
    userId: string
    actorLabel: string
  },
  event: {
    promocionId: string
    tipo: PromotionEventType
    titulo: string
    detalle?: string
    codigoMotivo?: string
    notaMotivo?: string
    metadatos?: Record<string, unknown>
  }
): Promise<void> {
  const { error } = await ctx.supabase.from("promocion_eventos").insert({
    org_id: ctx.orgId,
    promocion_id: event.promocionId,
    tipo: event.tipo,
    titulo: event.titulo,
    detalle: event.detalle ?? null,
    actor_tipo: "usuario",
    actor_id: ctx.userId,
    actor_etiqueta: ctx.actorLabel,
    codigo_motivo: event.codigoMotivo ?? null,
    nota_motivo: event.notaMotivo ?? null,
    metadatos: (event.metadatos ?? {}) as Json,
  })
  if (error) {
    console.error("No se pudo registrar el evento de la promoción", error)
  }
}
