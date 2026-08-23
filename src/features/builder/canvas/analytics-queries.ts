import { createClient } from "@/lib/supabase/server"

export type RunStepResumen = {
  nodeId: string
  etiqueta: string
  port: string | null
  conteoEntrada: number
  conteoSalida: number
}

export type RunResumen = {
  id: string
  tipo: "simulacion" | "publicacion"
  finalizado_en: string | null
  pasos: RunStepResumen[]
}

/** Última corrida (simulación o publicación) del workflow, con sus pasos por nodo/rama. */
export async function getUltimaCorrida(
  workflowId: string
): Promise<RunResumen | null> {
  const supabase = await createClient()

  const { data: run } = await supabase
    .from("workflow_runs")
    .select("id, tipo, finalizado_en")
    .eq("workflow_id", workflowId)
    .order("iniciado_en", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!run) return null

  const { data: steps } = await supabase
    .from("workflow_run_steps")
    .select(
      "node_id, port, conteo_entrada, conteo_salida, nodo:workflow_nodes(etiqueta)"
    )
    .eq("workflow_run_id", run.id)

  return {
    id: run.id,
    tipo: run.tipo as "simulacion" | "publicacion",
    finalizado_en: run.finalizado_en,
    pasos: (steps ?? []).map((s) => ({
      nodeId: s.node_id,
      etiqueta: s.nodo?.etiqueta ?? "Bloque eliminado",
      port: s.port,
      conteoEntrada: s.conteo_entrada ?? 0,
      conteoSalida: s.conteo_salida ?? 0,
    })),
  }
}
