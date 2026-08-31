import { createClient } from "@/lib/supabase/server"
import type { ApprovalStatus, StatusChangeReason } from "@/types/domain"

/**
 * Lecturas de `promotion_approval` — separado de `lib/queries.ts` (ya muy
 * grande) porque es un tema propio: la bandeja de aprobaciones, no el
 * listado/detalle de promociones.
 */
export type PromotionApprovalWithPromotion = {
  id: string
  promocion_id: string
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
  promotion: { nombre: string; codigo: string } | null
}

const PROMOTION_APPROVAL_EMBED = `
  id, promocion_id, requested_by, requested_at, approver_id, status,
  codigo_motivo, nota_motivo, note, decided_at,
  requested_by_profile:profiles!promotion_approval_requested_by_fkey(nombre),
  approver_profile:profiles!promotion_approval_approver_id_fkey(nombre),
  promotion:promociones(nombre, codigo)
`

export async function listPendingPromotionApprovals(): Promise<
  PromotionApprovalWithPromotion[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promotion_approval")
    .select(PROMOTION_APPROVAL_EMBED)
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PromotionApprovalWithPromotion[]
}

/** Historial (decididas o retiradas) — más recientes primero. */
export async function listDecidedPromotionApprovals(
  limit = 20
): Promise<PromotionApprovalWithPromotion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("promotion_approval")
    .select(PROMOTION_APPROVAL_EMBED)
    .neq("status", "pending")
    .order("decided_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as PromotionApprovalWithPromotion[]
}

/** Para la insignia "N pendientes de aprobación" de `/promociones` (mismo patrón que `/cupones`). */
export async function countPendingPromotionApprovals(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("promotion_approval")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
  if (error) throw error
  return count ?? 0
}
