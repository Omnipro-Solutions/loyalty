import { createClient } from "@/lib/supabase/server"

export type RunStepSummary = {
  nodeId: string
  label: string
  port: string | null
  entryCount: number
  exitCount: number
}

export type RunSummary = {
  id: string
  tipo: "simulacion" | "publicacion"
  finalizado_en: string | null
  steps: RunStepSummary[]
}

/** Última corrida (simulación o publicación) del workflow, con sus pasos por nodo/rama. */
export async function getLatestRun(
  workflowId: string
): Promise<RunSummary | null> {
  const supabase = await createClient()

  const { data: run } = await supabase
    .from("workflow_runs")
    .select("id, tipo, finalizado_en")
    .eq("workflow_id", workflowId)
    .order("iniciado_en", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!run) return null

  const { data: rows } = await supabase
    .from("workflow_run_steps")
    .select(
      "node_id, port, conteo_entrada, conteo_salida, node:workflow_nodes(etiqueta)"
    )
    .eq("workflow_run_id", run.id)

  return {
    id: run.id,
    tipo: run.tipo as "simulacion" | "publicacion",
    finalizado_en: run.finalizado_en,
    steps: (rows ?? []).map((s) => ({
      nodeId: s.node_id,
      label: s.node?.etiqueta ?? "Bloque eliminado",
      port: s.port,
      entryCount: s.conteo_entrada ?? 0,
      exitCount: s.conteo_salida ?? 0,
    })),
  }
}
