"use client"

import { useState } from "react"

import { ApprovalDecisionDialog } from "./approval-decision-dialog"
import { WithdrawApprovalDialog } from "./withdraw-approval-dialog"

type ApprovalRowActionsProps = {
  approvalId: string
  batchReference: string
  isOwnRequest: boolean
  canDecide: boolean
}

/** Fila de "/cupones/aprobaciones": cuatro ojos también en la UI — quien solicitó solo ve "Retirar", nunca "Aprobar"/"Rechazar" sobre su propia solicitud. */
export function ApprovalRowActions({
  approvalId,
  batchReference,
  isOwnRequest,
  canDecide,
}: ApprovalRowActionsProps) {
  const [openDialog, setOpenDialog] = useState<
    "approve" | "reject" | "withdraw" | null
  >(null)

  if (isOwnRequest) {
    return (
      <>
        <button
          type="button"
          className="text-xs font-medium text-destructive"
          onClick={() => setOpenDialog("withdraw")}
        >
          Retirar
        </button>
        <WithdrawApprovalDialog
          open={openDialog === "withdraw"}
          onOpenChange={(open) => setOpenDialog(open ? "withdraw" : null)}
          approvalId={approvalId}
          batchReference={batchReference}
        />
      </>
    )
  }

  if (!canDecide) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        className="text-xs font-medium text-destructive"
        onClick={() => setOpenDialog("reject")}
      >
        Rechazar
      </button>
      <button
        type="button"
        className="text-xs font-medium text-primary"
        onClick={() => setOpenDialog("approve")}
      >
        Aprobar
      </button>

      <ApprovalDecisionDialog
        open={openDialog === "approve"}
        onOpenChange={(open) => setOpenDialog(open ? "approve" : null)}
        approvalId={approvalId}
        batchReference={batchReference}
        decision="approved"
      />
      <ApprovalDecisionDialog
        open={openDialog === "reject"}
        onOpenChange={(open) => setOpenDialog(open ? "reject" : null)}
        approvalId={approvalId}
        batchReference={batchReference}
        decision="rejected"
      />
    </div>
  )
}
