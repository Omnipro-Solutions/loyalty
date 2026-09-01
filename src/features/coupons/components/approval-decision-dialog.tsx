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

import { decideCouponApprovalsAction } from "../actions/approvals"

type ApprovalDecisionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  approvalId: string
  batchReference: string
  decision: "approved" | "rejected"
}

/** 13.x no dibuja esta pantalla (el Figma no llega a la Fase 5) — se compone con el mismo patrón de diálogo del resto del módulo. */
export function ApprovalDecisionDialog({
  open,
  onOpenChange,
  approvalId,
  batchReference,
  decision,
}: ApprovalDecisionDialogProps) {
  const router = useRouter()
  const [note, setNote] = useState("")
  const [reasonCode, setReasonCode] = useState<DecisionReason>(
    decision === "approved" ? APPROVAL_REASONS[0] : REJECTION_REASONS[0]
  )

  const decide = useAction(decideCouponApprovalsAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      onOpenChange(false)
      setNote("")
      router.refresh()
    },
  })
  const isReject = decision === "rejected"
  const errorMessage = decide.result.serverError
    ? isReject
      ? "No se pudo rechazar la solicitud."
      : "No se pudo aprobar la solicitud."
    : decide.result.data?.ok === false
      ? (decide.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setNote("")
          decide.reset()
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isReject ? "Rechazar" : "Aprobar"} {batchReference}
          </DialogTitle>
          <DialogDescription>
            {isReject
              ? "La emisión vuelve a borrador — quien la solicitó puede revisarla y enviarla de nuevo a aprobación."
              : "La emisión pasa a generar sus códigos de inmediato."}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title={isReject ? "No se pudo rechazar" : "No se pudo aprobar"}
            description={errorMessage}
          />
        )}

        <DecisionReasonFields
          decision={decision}
          reasonCode={reasonCode}
          onReasonCodeChange={setReasonCode}
          note={note}
          onNoteChange={setNote}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={isReject ? "destructive" : "default"}
            disabled={decide.isPending}
            onClick={() =>
              decide.execute({
                approvalIds: [approvalId],
                decision,
                reasonCode,
                note: note.trim() || undefined,
              })
            }
          >
            {isReject ? "Rechazar solicitud" : "Aprobar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
