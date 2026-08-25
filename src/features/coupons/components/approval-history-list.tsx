import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/format"

import {
  COUPON_APPROVAL_STATUS_DOT,
  COUPON_APPROVAL_STATUS_LABEL,
  COUPON_ORIGIN_LABEL,
} from "../lib/labels"
import type { CouponApprovalWithBatch } from "../lib/queries"
import type { CouponApprovalStatus, CouponOrigin } from "@/types/domain"

type ApprovalHistoryListProps = { approvals: CouponApprovalWithBatch[] }

export function ApprovalHistoryList({ approvals }: ApprovalHistoryListProps) {
  if (approvals.length === 0) {
    return (
      <p className="px-1 py-4 text-center text-xs text-muted-foreground">
        Todavía no hay solicitudes decididas.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {approvals.map((approval) => {
        const status = approval.status as CouponApprovalStatus
        const decidedBy =
          status === "withdrawn"
            ? approval.requested_by_profile?.nombre
            : approval.approver_profile?.nombre

        return (
          <div
            key={approval.id}
            className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-xs last:border-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "size-[7px] shrink-0 rounded-full",
                  COUPON_APPROVAL_STATUS_DOT[status]
                )}
              />
              <span className="font-mono font-medium text-foreground">
                {approval.batch?.reference ?? "—"}
              </span>
              <span className="truncate text-muted-foreground">
                {approval.batch
                  ? COUPON_ORIGIN_LABEL[approval.batch.origin as CouponOrigin]
                  : ""}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">
                {COUPON_APPROVAL_STATUS_LABEL[status]}
              </span>
              {decidedBy && <span>· {decidedBy}</span>}
              {approval.decided_at && (
                <span>· {formatRelativeTime(approval.decided_at)}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
