import { createClient } from "@/lib/supabase/server"
import type {
  ApprovalStatus,
  BenefitType,
  ChannelScope,
  DecisionReason,
  StatusChangeReason,
} from "@/types/domain"

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
  /** Motivo de la decisión (`DECISION_REASONS`). `null` en las retiradas y en lo decidido antes de `20260901110000`. */
  codigo_decision: DecisionReason | null
  decided_at: string | null
  requested_by_profile: { nombre: string } | null
  approver_profile: { nombre: string } | null
  /**
   * Lo que hace falta para decidir sin abrir la promoción en otra pestaña:
   * la mecánica, dónde aplica, hasta cuándo y con cuánto presupuesto. La
   * bandeja lo resume en una línea (ver `facts` en `ApprovalsInbox`).
   */
  promotion: {
    nombre: string
    codigo: string
    tipo_beneficio: BenefitType
    compra_cantidad: number | null
    paga_cantidad: number | null
    canal_aplicacion: ChannelScope
    vigente_desde: string
    vigente_hasta: string | null
    presupuesto_asignado: number
  } | null
}

const PROMOTION_APPROVAL_EMBED = `
  id, promocion_id, requested_by, requested_at, approver_id, status,
  codigo_motivo, nota_motivo, note, codigo_decision, decided_at,
  requested_by_profile:profiles!promotion_approval_requested_by_fkey(nombre),
  approver_profile:profiles!promotion_approval_approver_id_fkey(nombre),
  promotion:promociones(
    nombre, codigo, tipo_beneficio, compra_cantidad, paga_cantidad,
    canal_aplicacion, vigente_desde, vigente_hasta, presupuesto_asignado
  )
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
