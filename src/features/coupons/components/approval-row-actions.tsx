"use client"

import { useState } from "react"

import { ApprovalDecisionDialog } from "./approval-decision-dialog"
import { WithdrawApprovalDialog } from "./withdraw-approval-dialog"

type ApprovalRowActionsProps = {
  approvalId: string
  batchReference: string
  isOwnRequest: boolean
  canDecide: boolean
  /** `cupones:autoaprobar`: la excepción opt-in que deja firmar lo propio (ver `approvalBlock` en `lib/approval-flow.ts`). */
  canSelfApprove: boolean
}

/** Fila de "/cupones/aprobaciones": cuatro ojos también en la UI — quien solicitó solo ve "Retirar", nunca "Aprobar"/"Rechazar" sobre su propia solicitud, salvo que su rol tenga `cupones:autoaprobar`. */
export function ApprovalRowActions({
  approvalId,
  batchReference,
  isOwnRequest,
  canDecide,
  canSelfApprove,
}: ApprovalRowActionsProps) {
  const [openDialog, setOpenDialog] = useState<
    "approve" | "reject" | "withdraw" | null
  >(null)

  // Calco de `features/promotions/components/approval-row-actions.tsx`: lo
  // único que deja decidir una solicitud propia es `autoaprobar` (mismo
  // criterio que `approvalBlock` y que `can_self_approve()` en SQL). Con él,
  // firmar y retirar conviven: son decisiones distintas.
  const canDecideThis = canDecide && (!isOwnRequest || canSelfApprove)

  if (!canDecideThis && !isOwnRequest) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {isOwnRequest && (
        <button
          type="button"
          className="text-xs font-medium text-destructive"
          onClick={() => setOpenDialog("withdraw")}
        >
          Retirar
        </button>
      )}
      {canDecideThis && (
        <button
          type="button"
          className="text-xs font-medium text-destructive"
          onClick={() => setOpenDialog("reject")}
        >
          Rechazar
        </button>
      )}
      {canDecideThis && (
        <button
          type="button"
          className="text-xs font-medium text-primary"
          onClick={() => setOpenDialog("approve")}
        >
          Aprobar
        </button>
      )}

      {isOwnRequest && (
        <WithdrawApprovalDialog
          open={openDialog === "withdraw"}
          onOpenChange={(open) => setOpenDialog(open ? "withdraw" : null)}
          approvalId={approvalId}
          batchReference={batchReference}
        />
      )}
      {canDecideThis && (
        <>
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
        </>
      )}
    </div>
  )
}
