"use server"

import { z } from "zod"

import { builderActionClient } from "./action-client"
import { listWorkflowVersions, getWorkflowVersionGraph } from "./queries"

const workflowIdSchema = z.object({ workflowId: z.string().uuid() })

export const listVersionsAction = builderActionClient
  .inputSchema(workflowIdSchema)
  .action(async ({ parsedInput }) => {
    const versions = await listWorkflowVersions(parsedInput.workflowId)
    return { ok: true as const, versions }
  })

export const getVersionGraphAction = builderActionClient
  .inputSchema(workflowIdSchema.extend({ version: z.number().int().min(1) }))
  .action(async ({ parsedInput }) => {
    const graph = await getWorkflowVersionGraph(
      parsedInput.workflowId,
      parsedInput.version
    )
    if (!graph) {
      return { ok: false as const, message: "Versión no encontrada." }
    }
    return { ok: true as const, graph }
  })
