import type { z } from "zod"

import type { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database.types"

import { hasV2Schema, nodeToDb } from "./schema-compat"
import type { graphEdgeSchema, graphNodeSchema } from "./schemas"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type GraphNode = z.infer<typeof graphNodeSchema>
type GraphEdge = z.infer<typeof graphEdgeSchema>

/**
 * Persiste el grafo completo (nodos + aristas) del canvas. Estrategia:
 * upsert de nodos por id (los ids los genera el cliente con
 * `crypto.randomUUID()` al soltar un bloque, así son estables entre
 * guardados), borrar los que ya no están, y reemplazar las aristas por
 * completo (su volumen es bajo por workflow y no tienen identidad propia
 * más allá de origen+puerto+destino, así que borrar+reinsertar es más
 * simple que hacer diff).
 *
 * Función de datos normal (sin "use server"), no una Server Action — la
 * comparten `saveGraphAction` (botón "Guardar", explícito — el builder ya
 * no autoguarda) y `publishWorkflowAction`: publicar debe dejar
 * `workflow_nodes`/`workflow_edges` (lo que el canvas carga al recargar la
 * página) sincronizado con la versión publicada, aunque el usuario nunca
 * haya hecho clic en "Guardar" — si no, tras publicar sin guardar antes, el
 * canvas volvería a mostrar el último grafo guardado (posiblemente vacío)
 * en vez del que realmente se publicó.
 *
 * Contra una base sin migrar, los tipos nuevos (`evento`, `union`,
 * `emitir_evento`…) violan `workflow_nodes_tipo_check`, así que `nodeToDb`
 * los guarda bajo un tipo portador con el real en `config`. En una base
 * migrada devuelve el nodo intacto (ver `schema-compat.ts`).
 */
export async function persistGraph(
  supabase: SupabaseServerClient,
  userId: string,
  workflowId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  /** Renombrar es un cambio de borrador más, así que se persiste aquí y no en su propia acción (ver `saveGraphSchema`). */
  nombre?: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const legacy = !(await hasV2Schema(supabase))

  if (nodes.length) {
    const { error: upsertError } = await supabase.from("workflow_nodes").upsert(
      nodes.map((n) => {
        const row = nodeToDb(n.tipo, n.config, legacy)
        return {
          id: n.id,
          workflow_id: workflowId,
          tipo: row.tipo,
          etiqueta: n.etiqueta,
          posicion_x: n.posicion_x,
          posicion_y: n.posicion_y,
          config: row.config as Json,
        }
      })
    )
    if (upsertError) {
      return { ok: false, message: "No se pudo guardar el grafo." }
    }
  }

  const { data: existingNodes } = await supabase
    .from("workflow_nodes")
    .select("id")
    .eq("workflow_id", workflowId)
  const incomingIds = new Set(nodes.map((n) => n.id))
  const idsToDelete = (existingNodes ?? [])
    .map((n) => n.id)
    .filter((id) => !incomingIds.has(id))
  if (idsToDelete.length) {
    await supabase.from("workflow_nodes").delete().in("id", idsToDelete)
  }

  await supabase.from("workflow_edges").delete().eq("workflow_id", workflowId)
  if (edges.length) {
    const { error: edgesError } = await supabase.from("workflow_edges").insert(
      edges.map((e) => ({
        workflow_id: workflowId,
        source_node_id: e.source_node_id,
        source_port: e.source_port,
        target_node_id: e.target_node_id,
      }))
    )
    if (edgesError) {
      return { ok: false, message: "No se pudieron guardar las conexiones." }
    }
  }

  await supabase
    .from("workflows")
    .update({ actualizado_por: userId, ...(nombre ? { nombre } : {}) })
    .eq("id", workflowId)

  return { ok: true }
}
