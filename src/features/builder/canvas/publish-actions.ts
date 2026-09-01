"use server"

import { revalidatePath } from "next/cache"

import type { Json } from "@/types/database.types"

import {
  simulateWorkflow,
  type SimEdge,
  type SimNode,
  type SimStep,
} from "../engine/simulate"
import { validateGraph } from "../validation/graph-validation"
import { canTransitionStatus } from "@/lib/publication-status"

import { builderActionClient } from "./action-client"
import { hasPermission } from "./permissions"
import { persistGraph } from "./persist-graph"
import { applyWorkflowPublicationTarget } from "./publish-gate"
import { hasV2Schema, lifecycleUpdate, statusFromDb } from "./schema-compat"
import {
  publishWorkflowSchema,
  runInputSchema,
  statusChangeSchema,
} from "./schemas"

type RunStepRow = {
  workflow_run_id: string
  node_id: string
  port: string | null
  conteo_entrada: number
  conteo_salida: number
}

/** Compartido por Simular y Publicar — ambos corren el mismo motor puro y guardan las mismas filas de `workflow_run_steps`. */
function stepsToRows(runId: string, steps: SimStep[]): RunStepRow[] {
  return steps.flatMap((p): RunStepRow[] => {
    if (!p.outputs.length) {
      return [
        {
          workflow_run_id: runId,
          node_id: p.nodeId,
          port: null,
          conteo_entrada: p.entryCount,
          conteo_salida: 0,
        },
      ]
    }
    return p.outputs.map((s) => ({
      workflow_run_id: runId,
      node_id: p.nodeId,
      port: s.port,
      conteo_entrada: p.entryCount,
      conteo_salida: s.count,
    }))
  })
}

/**
 * Simular: corre el motor puro (`engine/simulate.ts`) sobre el grafo tal
 * cual está en el canvas (aunque tenga advertencias — solo Publicar
 * bloquea con errores reales), y persiste el resultado en
 * `workflow_runs`/`workflow_run_steps` para que quede en el historial y la
 * analítica (08.3) pueda leerlo después.
 */
export const simulateWorkflowAction = builderActionClient
  .inputSchema(runInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "ver")) {
      return {
        ok: false as const,
        message: "No tienes permiso para ver reglas.",
      }
    }

    const { workflowId, nodes, edges, initialCohort } = parsedInput

    const simNodes: SimNode[] = nodes.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      config: n.config,
    }))
    const simEdges: SimEdge[] = edges.map((e) => ({
      source_node_id: e.source_node_id,
      source_port: e.source_port,
      target_node_id: e.target_node_id,
    }))
    const steps = simulateWorkflow(simNodes, simEdges, initialCohort)

    const { data: run, error: runError } = await ctx.supabase
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        workflow_version: 0,
        tipo: "simulacion",
        estado: "completado",
        resumen: { initialCohort, steps } as unknown as Json,
        finalizado_en: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (runError || !run) {
      return {
        ok: false as const,
        message: "No se pudo guardar la simulación.",
      }
    }

    if (steps.length) {
      await ctx.supabase
        .from("workflow_run_steps")
        .insert(stepsToRows(run.id, steps))
    }

    return { ok: true as const, steps }
  })

/**
 * Publicar: además de crear el snapshot de versión, persiste el grafo en
 * `workflow_nodes`/`workflow_edges` (mismo helper que el botón "Guardar",
 * ver `persist-graph.ts`) — el builder ya no autoguarda, así que sin esto
 * publicar sin haber guardado antes dejaría la versión publicada
 * desincronizada del grafo "vivo" que el canvas carga al recargar la
 * página.
 *
 * A diferencia de "Guardar" (que nunca versiona), esto SÍ crea un snapshot
 * en `workflow_versions` y sube `version_actual` — es el único punto donde
 * "guardar" y "versionar" coinciden a propósito, para no acumular una
 * versión por cada guardado.
 *
 * Bloqueante vs. advertencia: solo los `level: "error"` de
 * `validateGraph` (sin entrada, más de una entrada, ciclo) impiden publicar.
 * Ramas sin conectar son solo advertencia — un draft real casi siempre
 * tiene alguna mientras se construye, forzar conectarlas todas antes de
 * poder guardar una versión sería demasiada fricción.
 *
 * También corre el motor de simulación y guarda sus pasos (igual que
 * Simular) — si no, la corrida de tipo "publicacion" quedaba sin filas en
 * `workflow_run_steps`, y como la analítica (08.3) siempre lee la corrida
 * MÁS RECIENTE (`getLatestRun`), publicar después de simular tapaba los
 * conteos reales con una corrida vacía. Bug real, no solo cosmético.
 */
export const publishWorkflowAction = builderActionClient
  .inputSchema(publishWorkflowSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para publicar reglas.",
      }
    }

    const {
      workflowId,
      nombre,
      nodes,
      edges,
      initialCohort,
      estado,
      motivo,
      nota,
      vigente_desde,
      vigente_hasta,
    } = parsedInput

    const errors = validateGraph(
      nodes.map((n) => ({ id: n.id, tipo: n.tipo, config: n.config })),
      edges
    ).filter((i) => i.level === "error")

    if (errors.length) {
      return {
        ok: false as const,
        message: errors.map((e) => e.message).join(" "),
      }
    }

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

    const { data: workflow } = await ctx.supabase
      .from("workflows")
      .select("version_actual, estado")
      .eq("id", workflowId)
      .single()
    const newVersion = (workflow?.version_actual ?? 0) + 1

    const graph = { nodes, edges }

    const { error: versionError } = await ctx.supabase
      .from("workflow_versions")
      .insert({
        workflow_id: workflowId,
        version: newVersion,
        grafo: graph as unknown as Json,
        autor_id: ctx.userId,
      })
    if (versionError) {
      return { ok: false as const, message: "No se pudo crear la versión." }
    }

    // Contra una base sin migrar, `estado = 'activa'` viola
    // `workflows_estado_check` y las columnas de vigencia no existen: se
    // traduce al vocabulario viejo y se omiten (ver `schema-compat.ts`).
    const legacy = !(await hasV2Schema(ctx.supabase))

    await ctx.supabase
      .from("workflows")
      .update({
        ...lifecycleUpdate({ vigente_desde, vigente_hasta }, legacy),
        version_actual: newVersion,
        actualizado_por: ctx.userId,
      })
      .eq("id", workflowId)

    // El estado con el que se cierra lo elige quien publica — no siempre es
    // `activa`: publicar algo que empieza el mes que viene, o dejarlo listo
    // pero suspendido, son decisiones legítimas. Aparte del UPDATE de
    // arriba porque `applyWorkflowPublicationTarget` traduce ese destino a
    // `pendiente_aprobacion` cuando es `activa` (ver `publish-gate.ts`) — y
    // solo toca la columna `estado`.
    const current = statusFromDb(workflow?.estado ?? "borrador")
    const gate = await applyWorkflowPublicationTarget(ctx, {
      workflowId,
      from: current,
      to: estado,
      motivo,
      nota,
    })
    if (!gate.ok) {
      return { ok: false as const, message: gate.message }
    }

    const simNodes: SimNode[] = nodes.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      config: n.config,
    }))
    const simEdges: SimEdge[] = edges.map((e) => ({
      source_node_id: e.source_node_id,
      source_port: e.source_port,
      target_node_id: e.target_node_id,
    }))
    const steps = simulateWorkflow(simNodes, simEdges, initialCohort)

    const { data: run } = await ctx.supabase
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        workflow_version: newVersion,
        tipo: "publicacion",
        estado: "completado",
        resumen: { initialCohort, steps } as unknown as Json,
        finalizado_en: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (run && steps.length) {
      await ctx.supabase
        .from("workflow_run_steps")
        .insert(stepsToRows(run.id, steps))
    }

    revalidatePath("/journeys")
    revalidatePath(`/journeys/${workflowId}`)
    // `gate.estado`, no `estado` (lo pedido): si quien publica no es admin,
    // esto es `pendiente_aprobacion`, no `activa` — la UI necesita
    // enterarse de eso sin esperar a un refresh.
    return { ok: true as const, version: newVersion, estado: gate.estado }
  })

/**
 * Cambiar el estado de una regla ya publicada. Es la ÚNICA edición que
 * queda disponible una vez publicada: los bloques pasan a solo lectura (ver
 * `isLocked` en `lib/publication-status.ts`), porque volver a editarlos
 * cambiaría lo que el motor ya estuvo evaluando sin dejar rastro de que
 * antes decía otra cosa.
 *
 * La transición se vuelve a validar en el servidor aunque el diálogo ya
 * solo ofrezca las permitidas: la lista de opciones de un cliente no es una
 * garantía, y `finalizada → borrador` no debe ser alcanzable ni con una
 * petición hecha a mano.
 */
export const changeWorkflowStatusAction = builderActionClient
  .inputSchema(statusChangeSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!hasPermission(ctx.permissionsSet, "journeys", "editar")) {
      return {
        ok: false as const,
        message: "No tienes permiso para cambiar el estado de reglas.",
      }
    }

    const { workflowId, estado, motivo, nota, vigente_desde, vigente_hasta } =
      parsedInput

    const { data: workflow } = await ctx.supabase
      .from("workflows")
      .select("estado")
      .eq("id", workflowId)
      .single()

    if (!workflow) {
      return { ok: false as const, message: "La regla ya no existe." }
    }

    const legacy = !(await hasV2Schema(ctx.supabase))
    // La columna puede seguir guardando 'publicado'/'pausado': traducir
    // ANTES de validar la transición, o `canTransitionStatus` recibiría un
    // estado que no está en su tabla y rechazaría cualquier cambio.
    const current = statusFromDb(workflow.estado)
    if (!canTransitionStatus(current, estado)) {
      return {
        ok: false as const,
        message: `No se puede pasar de ${current} a ${estado}.`,
      }
    }

    const { error } = await ctx.supabase
      .from("workflows")
      .update({
        actualizado_por: ctx.userId,
        ...lifecycleUpdate({ vigente_desde, vigente_hasta }, legacy),
      })
      .eq("id", workflowId)

    if (error) {
      return { ok: false as const, message: "No se pudo cambiar el estado." }
    }

    // `applyWorkflowPublicationTarget` sustituye por `pendiente_aprobacion`
    // CUALQUIER destino `activa` — también la reactivación de una regla
    // pausada, que es justo lo que esta acción suele pedir. Inactivar y
    // finalizar se guardan tal cual: no publican nada.
    const gate = await applyWorkflowPublicationTarget(ctx, {
      workflowId,
      from: current,
      to: estado,
      motivo,
      nota,
    })
    if (!gate.ok) {
      return { ok: false as const, message: gate.message }
    }

    revalidatePath("/journeys")
    revalidatePath(`/journeys/${workflowId}`)
    // El estado devuelto es el que quedó guardado de verdad — no
    // necesariamente `estado` (lo pedido): si el gate lo mandó a
    // `pendiente_aprobacion`, la UI necesita enterarse de eso, no de que
    // "activa" se aplicó.
    return { ok: true as const, estado: gate.estado }
  })
