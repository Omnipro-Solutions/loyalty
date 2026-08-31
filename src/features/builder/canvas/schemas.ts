import { z } from "zod"

import {
  BUILDER_NODE_TYPES,
  SELECTABLE_PUBLICATION_STATUSES,
  STATUS_CHANGE_REASONS,
  WORKFLOW_STATUSES,
  type BuilderNodeType,
} from "@/types/domain"

const builderNodeTypeSchema = z
  .string()
  .refine((v): v is BuilderNodeType =>
    (BUILDER_NODE_TYPES as readonly string[]).includes(v)
  )

export const deleteWorkflowsSchema = z.object({
  workflowIds: z.array(z.string().uuid()).min(1),
})

export const graphNodeSchema = z.object({
  id: z.string(),
  tipo: builderNodeTypeSchema,
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

/**
 * Crear ya no es "reservar un id al entrar": la fila nace con el primer
 * "Guardar", con el grafo que haya en el canvas. Por eso lleva `nodes`/
 * `edges` — hasta ese momento la regla solo existe en memoria, en
 * `/journeys/nuevo`.
 */
export const createWorkflowSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
  nodes: z.array(graphNodeSchema).default([]),
  edges: z.array(graphEdgeSchema).default([]),
})

/**
 * `nombre` viaja con el grafo porque renombrar la regla es un cambio de
 * borrador más: el builder no autoguarda, así que el nombre nuevo se queda
 * en pantalla hasta que se pulsa "Guardar" (o "Publicar", que también
 * persiste), igual que mover un bloque o editar su config.
 */
export const saveGraphSchema = z.object({
  workflowId: z.string().uuid(),
  nombre: z.string().min(1, "El nombre es obligatorio").max(120).optional(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
})

export const runInputSchema = z.object({
  workflowId: z.string().uuid(),
  /** Solo lo usa publicar (que persiste el grafo); simular lo ignora. */
  nombre: z.string().min(1, "El nombre es obligatorio").max(120).optional(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
  initialCohort: z.number().min(1).default(1000),
})

/**
 * Publicar y cambiar de estado comparten forma porque son la misma
 * operación: fijar el estado con un motivo que quede en la bitácora. Al
 * publicar además se declara la vigencia, que es lo que hace que `activa`
 * se muestre como `programada` o `finalizada` sin guardar esos estados.
 *
 * `motivo` no es opcional a propósito: sin él la bitácora registra que algo
 * cambió pero no por qué, que es justo lo que hace falta al auditar.
 */
export const statusChangeSchema = z
  .object({
    workflowId: z.string().uuid(),
    // `pendiente_aprobacion` no es un destino elegible por el cliente — lo
    // decide el servidor según el `rol_base` de quien publica (ver
    // `canvas/publish-gate.ts`).
    estado: z.enum(SELECTABLE_PUBLICATION_STATUSES),
    motivo: z.enum(STATUS_CHANGE_REASONS),
    nota: z.string().max(500).default(""),
    vigente_desde: z.string().optional(),
    vigente_hasta: z.string().nullable().optional(),
  })
  .refine((v) => v.motivo !== "otro" || v.nota.trim().length > 0, {
    path: ["nota"],
    message: "Describe el motivo para poder registrar el cambio.",
  })

export const publishWorkflowSchema = runInputSchema.extend({
  estado: z.enum(SELECTABLE_PUBLICATION_STATUSES).default("activa"),
  motivo: z.enum(STATUS_CHANGE_REASONS).default("decision_comercial"),
  nota: z.string().max(500).default(""),
  vigente_desde: z.string(),
  vigente_hasta: z.string().nullable().default(null),
})

/** Aprobar/rechazar una solicitud de `workflow_approval` — calco de `features/promotions/schemas.ts` `decideApprovalSchema`. */
export const decideApprovalSchema = z.object({
  approvalId: z.string().uuid(),
  note: z.string().optional(),
})

export const withdrawApprovalSchema = z.object({
  approvalId: z.string().uuid(),
})

/** Filtros del toolbar de `/journeys`, sin `page`/`pageSize` — comparte
 *  `previewWorkflowsExportAction` (conteo) y `exportWorkflowsAction`
 *  (además valida `columns`). */
export const workflowsExportFiltersSchema = z.object({
  status: z.enum(WORKFLOW_STATUSES).optional(),
  q: z.string().max(200).optional(),
})
export type WorkflowsExportFiltersInput = z.infer<
  typeof workflowsExportFiltersSchema
>

/** `columns`: keys de `WORKFLOWS_EXPORT_COLUMN_OPTIONS` marcadas en el diálogo — vacío exporta todas. */
export const exportWorkflowsSchema = workflowsExportFiltersSchema.extend({
  columns: z.array(z.string()).optional(),
})
