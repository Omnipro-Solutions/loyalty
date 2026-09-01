"use server"

import { revalidatePath } from "next/cache"

import { builderActionClient } from "./action-client"
import { persistGraph } from "./persist-graph"
import { hasPermission } from "./permissions"
import {
  createWorkflowSchema,
  deleteWorkflowsSchema,
  saveGraphSchema,
} from "./schemas"

/**
 * Primer "Guardar" de una regla nueva: crea la fila y persiste de una vez el
 * grafo que ya está en el canvas. Entrar al editor (`/journeys/nuevo`) NO
 * escribe nada — el builder no autoguarda, y eso incluye no dejar
 * borradores fantasma en la lista por haber abierto el canvas y salir.
 */
export const createWorkflowAction = builderActionClient
  .inputSchema(createWorkflowSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "crear")) {
      return {
        ok: false as const,
        message: "No tienes permiso para crear reglas.",
      }
    }

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
      return { ok: false as const, message: "No se pudo crear la regla." }
    }

    const workflowId = data.id as string
    const persisted = await persistGraph(
      ctx.supabase,
      ctx.userId,
      workflowId,
      parsedInput.nodes,
      parsedInput.edges
    )
    if (!persisted.ok) {
      return { ok: false as const, message: persisted.message }
    }

    revalidatePath("/journeys")
    return {
      ok: true as const,
      id: workflowId,
      savedAt: new Date().toISOString(),
    }
  })

export const deleteWorkflowsAction = builderActionClient
  .inputSchema(deleteWorkflowsSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "eliminar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para eliminar reglas.",
      }
    }

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
    if (!hasPermission(ctx.permissionsSet, "journeys", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para editar reglas.",
      }
    }

    const { workflowId, nombre, nodes, edges } = parsedInput

    const persisted = await persistGraph(
      ctx.supabase,
      ctx.userId,
      workflowId,
      nodes,
      edges,
      nombre
    )
    if (!persisted.ok) {
      return { ok: false as const, message: persisted.message }
    }

    return { ok: true as const, savedAt: new Date().toISOString() }
  })
