"use server"

import { revalidatePath } from "next/cache"

import type { Json } from "@/types/database.types"

import {
  simularWorkflow,
  type SimEdge,
  type SimNode,
  type SimStep,
} from "../engine/simulate"
import { validarGrafo } from "../validation/graph-validation"
import { builderActionClient } from "./action-client"
import { runInputSchema } from "./schemas"

type FilaRunStep = {
  workflow_run_id: string
  node_id: string
  port: string | null
  conteo_entrada: number
  conteo_salida: number
}

/** Compartido por Simular y Publicar — ambos corren el mismo motor puro y guardan las mismas filas de `workflow_run_steps`. */
function pasosAFilas(runId: string, pasos: SimStep[]): FilaRunStep[] {
  return pasos.flatMap((p): FilaRunStep[] => {
    if (!p.salidas.length) {
      return [
        {
          workflow_run_id: runId,
          node_id: p.nodeId,
          port: null,
          conteo_entrada: p.conteoEntrada,
          conteo_salida: 0,
        },
      ]
    }
    return p.salidas.map((s) => ({
      workflow_run_id: runId,
      node_id: p.nodeId,
      port: s.port,
      conteo_entrada: p.conteoEntrada,
      conteo_salida: s.conteo,
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
    const { workflowId, nodes, edges, cohorteInicial } = parsedInput

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
    const pasos = simularWorkflow(simNodes, simEdges, cohorteInicial)

    const { data: run, error: runError } = await ctx.supabase
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        workflow_version: 0,
        tipo: "simulacion",
        estado: "completado",
        resumen: { cohorteInicial, pasos } as unknown as Json,
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

    if (pasos.length) {
      await ctx.supabase
        .from("workflow_run_steps")
        .insert(pasosAFilas(run.id, pasos))
    }

    return { ok: true as const, pasos }
  })

/**
 * Publicar: a diferencia del autoguardado (que nunca versiona), esto SÍ
 * crea un snapshot en `workflow_versions` y sube `version_actual` — es el
 * único punto donde "guardar" y "versionar" coinciden a propósito, para no
 * acumular una versión por cada autoguardado silencioso.
 *
 * Bloqueante vs. advertencia: solo los `nivel: "error"` de
 * `validarGrafo` (sin entrada, más de una entrada, ciclo) impiden publicar.
 * Ramas sin conectar son solo advertencia — un draft real casi siempre
 * tiene alguna mientras se construye, forzar conectarlas todas antes de
 * poder guardar una versión sería demasiada fricción.
 *
 * También corre el motor de simulación y guarda sus pasos (igual que
 * Simular) — si no, la corrida de tipo "publicacion" quedaba sin filas en
 * `workflow_run_steps`, y como la analítica (08.3) siempre lee la corrida
 * MÁS RECIENTE (`getUltimaCorrida`), publicar después de simular tapaba los
 * conteos reales con una corrida vacía. Bug real, no solo cosmético.
 */
export const publishWorkflowAction = builderActionClient
  .inputSchema(runInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workflowId, nodes, edges, cohorteInicial } = parsedInput

    const errores = validarGrafo(
      nodes.map((n) => ({ id: n.id, tipo: n.tipo, config: n.config })),
      edges
    ).filter((i) => i.nivel === "error")

    if (errores.length) {
      return {
        ok: false as const,
        message: errores.map((e) => e.mensaje).join(" "),
      }
    }

    const { data: workflow } = await ctx.supabase
      .from("workflows")
      .select("version_actual")
      .eq("id", workflowId)
      .single()
    const nuevaVersion = (workflow?.version_actual ?? 0) + 1

    const grafo = { nodes, edges }

    const { error: versionError } = await ctx.supabase
      .from("workflow_versions")
      .insert({
        workflow_id: workflowId,
        version: nuevaVersion,
        grafo: grafo as unknown as Json,
        autor_id: ctx.userId,
      })
    if (versionError) {
      return { ok: false as const, message: "No se pudo crear la versión." }
    }

    await ctx.supabase
      .from("workflows")
      .update({
        estado: "publicado",
        version_actual: nuevaVersion,
        actualizado_por: ctx.userId,
      })
      .eq("id", workflowId)

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
    const pasos = simularWorkflow(simNodes, simEdges, cohorteInicial)

    const { data: run } = await ctx.supabase
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        workflow_version: nuevaVersion,
        tipo: "publicacion",
        estado: "completado",
        resumen: { cohorteInicial, pasos } as unknown as Json,
        finalizado_en: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (run && pasos.length) {
      await ctx.supabase
        .from("workflow_run_steps")
        .insert(pasosAFilas(run.id, pasos))
    }

    revalidatePath("/journeys")
    revalidatePath(`/journeys/${workflowId}`)
    return { ok: true as const, version: nuevaVersion }
  })
