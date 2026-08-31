import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database.types"

import { hasStatusEventsTable } from "./schema-compat"

/**
 * Una fila en la bitácora por cada cambio de estado. Es lo que hace
 * auditable el ciclo de vida: sin el motivo (y su nota cuando es «otro»)
 * queda registrado QUÉ cambió pero no por qué, que es justo lo que se busca
 * al revisar por qué una regla dejó de aplicar.
 *
 * Vive aparte de `publish-actions.ts` (que la definía antes) para que
 * `publish-gate.ts` pueda usarla sin crear un import circular entre los dos
 * (`publish-actions.ts` también usa `publish-gate.ts`).
 *
 * No revienta la publicación si falla: la regla ya quedó publicada y perder
 * el registro es peor que quedarse a medias, pero no es motivo para
 * deshacer lo que sí funcionó.
 */
export async function recordStatusEvent(
  ctx: { supabase: SupabaseClient<Database>; userId: string },
  event: {
    workflowId: string
    estadoAnterior: string
    estadoNuevo: string
    motivo: string
    nota: string
  }
) {
  // La tabla puede no existir todavía (migración sin aplicar). Se comprueba
  // antes en vez de dejar que el insert falle porque el error de PostgREST
  // ensuciaría los logs de cada publicación con algo ya conocido.
  if (!(await hasStatusEventsTable(ctx.supabase))) return

  await ctx.supabase.from("workflow_status_events").insert({
    workflow_id: event.workflowId,
    estado_anterior: event.estadoAnterior,
    estado_nuevo: event.estadoNuevo,
    codigo_motivo: event.motivo,
    nota: event.nota || null,
    actor_id: ctx.userId,
  })
}
