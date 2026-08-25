import { formatNumber, formatRelativeTime } from "@/lib/format"
import type { ApprovalThresholdReason } from "../lib/thresholds"

import {
  APPROVAL_THRESHOLD_REASON_LABEL,
  COUPON_ORIGIN_LABEL,
} from "../lib/labels"
import type { CouponApprovalWithBatch } from "../lib/queries"
import { batchDiscountDisplay } from "../lib/recap"
import type { CouponOrigin } from "@/types/domain"
import { ApprovalRowActions } from "./approval-row-actions"

type ApprovalQueueListProps = {
  approvals: CouponApprovalWithBatch[]
  currentProfileId: string
  canDecide: boolean
}

/** Cola de doble aprobación (Fase 5) — sin nodo de Figma, se compone con el design system existente. */
export function ApprovalQueueList({
  approvals,
  currentProfileId,
  canDecide,
}: ApprovalQueueListProps) {
  if (approvals.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        No hay solicitudes de aprobación pendientes.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {approvals.map((approval) => {
        const batch = approval.batch
        const { headline, subtitle } = batch
          ? batchDiscountDisplay(batch)
          : { headline: "—", subtitle: "" }

        return (
          <div
            key={approval.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-border px-3.5 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-mono text-xs font-semibold text-primary">
                  {batch?.reference ?? "—"}
                </p>
                <p className="truncate text-[13px] text-foreground">
                  {batch?.name}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {batch
                  ? COUPON_ORIGIN_LABEL[batch.origin as CouponOrigin]
                  : "—"}
                {" · "}
                Solicitó {approval.requested_by_profile?.nombre ?? "alguien"}
                {" · "}
                {formatRelativeTime(approval.requested_at)}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {approval.threshold_reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-medium text-warning"
                  >
                    {
                      APPROVAL_THRESHOLD_REASON_LABEL[
                        reason as ApprovalThresholdReason
                      ]
                    }
                  </span>
                ))}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[13px] font-semibold text-foreground">
                {headline}
              </p>
              <p className="text-xs text-muted-foreground">
                {subtitle} · {formatNumber(batch?.requested_quantity ?? 0)}{" "}
                código
                {batch?.requested_quantity === 1 ? "" : "s"}
              </p>
            </div>

            <div className="w-[140px] shrink-0 text-right">
              <ApprovalRowActions
                approvalId={approval.id}
                batchReference={batch?.reference ?? approval.batch_id}
                isOwnRequest={approval.requested_by === currentProfileId}
                canDecide={canDecide}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
