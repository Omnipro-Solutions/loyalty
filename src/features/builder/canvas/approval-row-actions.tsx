"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { DecisionReasonFields } from "@/components/form/decision-reason-fields"
import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  APPROVAL_REASONS,
  REJECTION_REASONS,
  type DecisionReason,
} from "@/types/domain"

import {
  decideWorkflowApprovalsAction,
  withdrawWorkflowApprovalAction,
} from "./approvals"

type WorkflowApprovalRowActionsProps = {
  approvalId: string
  workflowName: string
  /** Cuatro ojos también en la UI: quien solicitó solo ve "Retirar", nunca "Aprobar"/"Rechazar" sobre su propia solicitud. */
  isOwnRequest: boolean
  canDecide: boolean
}

/**
 * Acciones de una fila de la bandeja. Usa la MISMA acción en bloque que la
 * barra de selección, con un solo id: así el motivo y la regla de cuatro
 * ojos se aplican igual se decida de una en una o de doce en doce.
 */
export function WorkflowApprovalRowActions({
  approvalId,
  workflowName,
  isOwnRequest,
  canDecide,
}: WorkflowApprovalRowActionsProps) {
  const router = useRouter()
  const [openDialog, setOpenDialog] = useState<
    "approved" | "rejected" | "withdraw" | null
  >(null)
  const [reasonCode, setReasonCode] = useState<DecisionReason>(
    APPROVAL_REASONS[0]
  )
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()

  function close() {
    setOpenDialog(null)
    setNote("")
    setError(undefined)
  }

  function openDecision(decision: "approved" | "rejected") {
    setReasonCode(
      decision === "approved" ? APPROVAL_REASONS[0] : REJECTION_REASONS[0]
    )
    setNote("")
    setError(undefined)
    setOpenDialog(decision)
  }

  function onResult(data: { ok: boolean; message?: string } | undefined) {
    if (!data?.ok) {
      setError(data?.message ?? "No se pudo completar la acción.")
      return
    }
    close()
    router.refresh()
  }

  const decide = useAction(decideWorkflowApprovalsAction, {
    onSuccess: ({ data }) => onResult(data),
    onError: () => setError("No se pudo completar la decisión."),
  })
  const withdraw = useAction(withdrawWorkflowApprovalAction, {
    onSuccess: ({ data }) => onResult(data),
    onError: () => setError("No se pudo retirar la solicitud."),
  })

  const pending = decide.isPending || withdraw.isPending

  function confirm() {
    setError(undefined)
    if (openDialog === "withdraw") {
      withdraw.execute({ approvalId })
      return
    }
    if (!openDialog) return
    if (reasonCode === "otro" && !note.trim()) {
      setError("Explica el motivo para poder guardarlo.")
      return
    }
    decide.execute({
      approvalIds: [approvalId],
      decision: openDialog,
      reasonCode,
      note: note.trim() || undefined,
    })
  }

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
        <Dialog
          open={openDialog === "withdraw"}
          onOpenChange={(open) => !open && close()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Retirar la solicitud</DialogTitle>
              <DialogDescription>
                «{workflowName}» volverá a Borrador y se podrá editar de nuevo.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Message
                variant="error"
                title="No se pudo completar"
                description={error}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancelar
              </Button>
              <Button type="button" onClick={confirm} disabled={pending}>
                {pending ? "Retirando…" : "Retirar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        onClick={() => openDecision("rejected")}
      >
        Rechazar
      </button>
      <button
        type="button"
        className="text-xs font-medium text-primary"
        onClick={() => openDecision("approved")}
      >
        Aprobar
      </button>

      <Dialog
        open={openDialog === "approved" || openDialog === "rejected"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openDialog === "approved" ? "Aprobar" : "Rechazar"} la solicitud
            </DialogTitle>
            <DialogDescription>
              «{workflowName}» —{" "}
              {openDialog === "approved"
                ? "pasará a Activa."
                : "volverá a Borrador y se podrá editar de nuevo."}
            </DialogDescription>
          </DialogHeader>
          {openDialog && openDialog !== "withdraw" && (
            <DecisionReasonFields
              decision={openDialog}
              reasonCode={reasonCode}
              onReasonCodeChange={setReasonCode}
              note={note}
              onNoteChange={setNote}
            />
          )}
          {error && (
            <Message
              variant="error"
              title="No se pudo completar"
              description={error}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirm} disabled={pending}>
              {pending
                ? "Guardando…"
                : openDialog === "approved"
                  ? "Aprobar"
                  : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
