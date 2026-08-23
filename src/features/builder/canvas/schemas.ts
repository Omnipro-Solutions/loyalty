import { z } from "zod"

import { BUILDER_NODE_TYPES, type BuilderNodeType } from "@/types/domain"

const builderNodeTipoSchema = z
  .string()
  .refine((v): v is BuilderNodeType =>
    (BUILDER_NODE_TYPES as readonly string[]).includes(v)
  )

export const createWorkflowSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
})

export const renameWorkflowSchema = z.object({
  workflowId: z.string().uuid(),
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
})

export const deleteWorkflowsSchema = z.object({
  workflowIds: z.array(z.string().uuid()).min(1),
})

export const graphNodeSchema = z.object({
  id: z.string(),
  tipo: builderNodeTipoSchema,
  etiqueta: z.string().min(1),
  posicion_x: z.number(),
  posicion_y: z.number(),
  config: z.record(z.string(), z.unknown()).default({}),
})

export const graphEdgeSchema = z.object({
  id: z.string(),
  source_node_id: z.string(),
  source_port: z.string().min(1).default("out"),
  target_node_id: z.string(),
})

export const saveGraphSchema = z.object({
  workflowId: z.string().uuid(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
})

export const runInputSchema = z.object({
  workflowId: z.string().uuid(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  cohorteInicial: z.number().min(1).default(1000),
})
