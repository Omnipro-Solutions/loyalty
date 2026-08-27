"use server"

import { revalidatePath } from "next/cache"

import { builderActionClient } from "./action-client"
import { persistGraph } from "./persist-graph"
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
 * Guardado explícito del canvas (botón "Guardar" en la barra del editor —
 * el builder ya no autoguarda). Decisión de producto: esto NO crea una
 * fila en `workflow_versions` — versionar (snapshot histórico) queda para
 * "Publicar workflow" / "Historial de versiones", que construye el
 * siguiente fork.
 */
export const saveGraphAction = builderActionClient
  .inputSchema(saveGraphSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workflowId, nodes, edges } = parsedInput
    const result = await persistGraph(
      ctx.supabase,
      ctx.userId,
      workflowId,
      nodes,
      edges
    )
    if (!result.ok) return result
    return { ok: true as const, savedAt: new Date().toISOString() }
  })
