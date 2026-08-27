"use server"

import { revalidatePath } from "next/cache"

import type { Json } from "@/types/database.types"

import { builderActionClient } from "./action-client"
import { hasV2Schema, nodeToDb } from "./schema-compat"
import {
  createWorkflowSchema,
  deleteWorkflowsSchema,
  renameWorkflowSchema,
  saveGraphSchema,
} from "./schemas"

export const createWorkflowAction = builderActionClient
  .inputSchema(createWorkflowSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data, error } = await ctx.supabase
      .from("workflows")
      .insert({
        org_id: ctx.orgId,
        nombre: parsedInput.nombre,
        creado_por: ctx.userId,
        actualizado_por: ctx.userId,
      })
      .select("id")
      .single()

    if (error || !data) {
      return { ok: false as const, message: "No se pudo crear el workflow." }
    }

    revalidatePath("/journeys")
    return { ok: true as const, id: data.id as string }
  })

export const renameWorkflowAction = builderActionClient
  .inputSchema(renameWorkflowSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("workflows")
      .update({ nombre: parsedInput.nombre, actualizado_por: ctx.userId })
      .eq("id", parsedInput.workflowId)

    if (error) {
      return { ok: false as const, message: "No se pudo renombrar." }
    }
    revalidatePath("/journeys")
    return { ok: true as const }
  })

/**
 * Borra uno o más workflows completos. RLS (`workflows_org`) ya limita el
 * `delete` a la organización del usuario — no hace falta repetir el filtro
 * por `org_id` aquí. `on delete cascade` en `workflow_nodes`/`workflow_edges`/
 * `workflow_versions`/`workflow_runs` se encarga del resto.
 */
export const deleteWorkflowsAction = builderActionClient
  .inputSchema(deleteWorkflowsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("workflows")
      .delete()
      .in("id", parsedInput.workflowIds)

    if (error) {
      return { ok: false as const, message: "No se pudieron eliminar." }
    }
    revalidatePath("/journeys")
    return { ok: true as const }
  })

/**
 * Guarda el grafo completo (nodos + aristas) del canvas. Estrategia:
 * upsert de nodos por id (los ids los genera el cliente con
 * `crypto.randomUUID()` al soltar un bloque, así son estables entre
 * guardados), borrar los que ya no están, y reemplazar las aristas por
 * completo (su volumen es bajo por workflow y no tienen identidad propia
 * más allá de origen+puerto+destino, así que borrar+reinsertar es más
 * simple que hacer diff).
 *
 * Decisión de producto: esto NO crea una fila en `workflow_versions` — el
 * autoguardado actualiza directamente el grafo "vivo" de `workflow_nodes`/
 * `workflow_edges`. Versionar (snapshot histórico) queda para "Publicar
 * workflow" / "Historial de versiones", que construye el siguiente fork —
 * meter una política de versionado aquí hubiera sido adivinar un diseño
 * que ese trabajo probablemente quiere definir distinto.
 */
export const saveGraphAction = builderActionClient
  .inputSchema(saveGraphSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workflowId, nodes, edges } = parsedInput

    // Contra una base sin migrar, los tipos nuevos (`evento`, `union`,
    // `emitir_evento`…) violan `workflow_nodes_tipo_check`, así que
    // `nodeToDb` los guarda bajo un tipo portador con el real en `config`.
    // En una base migrada devuelve el nodo intacto (ver `schema-compat.ts`).
    const legacy = !(await hasV2Schema(ctx.supabase))

    if (nodes.length) {
      const { error: upsertError } = await ctx.supabase
        .from("workflow_nodes")
        .upsert(
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
        return { ok: false as const, message: "No se pudo guardar el grafo." }
      }
    }

    const { data: existingNodes } = await ctx.supabase
      .from("workflow_nodes")
      .select("id")
      .eq("workflow_id", workflowId)
    const incomingIds = new Set(nodes.map((n) => n.id))
    const idsToDelete = (existingNodes ?? [])
      .map((n) => n.id)
      .filter((id) => !incomingIds.has(id))
    if (idsToDelete.length) {
      await ctx.supabase.from("workflow_nodes").delete().in("id", idsToDelete)
    }

    await ctx.supabase
      .from("workflow_edges")
      .delete()
      .eq("workflow_id", workflowId)
    if (edges.length) {
      const { error: edgesError } = await ctx.supabase
        .from("workflow_edges")
        .insert(
          edges.map((e) => ({
            workflow_id: workflowId,
            source_node_id: e.source_node_id,
            source_port: e.source_port,
            target_node_id: e.target_node_id,
          }))
        )
      if (edgesError) {
        return {
          ok: false as const,
          message: "No se pudieron guardar las conexiones.",
        }
      }
    }

    await ctx.supabase
      .from("workflows")
      .update({ actualizado_por: ctx.userId })
      .eq("id", workflowId)

    return { ok: true as const, savedAt: new Date().toISOString() }
  })
