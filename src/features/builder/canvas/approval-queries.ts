import { createClient } from "@/lib/supabase/server"
import type { ApprovalStatus, StatusChangeReason } from "@/types/domain"

/**
 * Lecturas de `workflow_approval` — calco de
 * `features/promotions/lib/approval-queries.ts`.
 */
export type WorkflowApprovalWithWorkflow = {
  id: string
  workflow_id: string
  requested_by: string | null
  requested_at: string
  approver_id: string | null
  status: ApprovalStatus
  codigo_motivo: StatusChangeReason
  nota_motivo: string | null
  note: string | null
  decided_at: string | null
  requested_by_profile: { nombre: string } | null
  approver_profile: { nombre: string } | null
  workflow: { nombre: string } | null
}

const WORKFLOW_APPROVAL_EMBED = `
  id, workflow_id, requested_by, requested_at, approver_id, status,
  codigo_motivo, nota_motivo, note, decided_at,
  requested_by_profile:profiles!workflow_approval_requested_by_fkey(nombre),
  approver_profile:profiles!workflow_approval_approver_id_fkey(nombre),
  workflow:workflows(nombre)
`

export async function listPendingWorkflowApprovals(): Promise<
  WorkflowApprovalWithWorkflow[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workflow_approval")
    .select(WORKFLOW_APPROVAL_EMBED)
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as WorkflowApprovalWithWorkflow[]
}

/** Historial (decididas o retiradas) — más recientes primero. */
export async function listDecidedWorkflowApprovals(
  limit = 20
): Promise<WorkflowApprovalWithWorkflow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("workflow_approval")
    .select(WORKFLOW_APPROVAL_EMBED)
    .neq("status", "pending")
    .order("decided_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as WorkflowApprovalWithWorkflow[]
}

/** Para la insignia "N pendientes de aprobación" de `/journeys` (mismo patrón que `/cupones`). */
export async function countPendingWorkflowApprovals(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("workflow_approval")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
  if (error) throw error
  return count ?? 0
}
