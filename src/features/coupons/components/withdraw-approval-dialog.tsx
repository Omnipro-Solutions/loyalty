"use client"

import { useAction } from "next-safe-action/hooks"

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

import { withdrawApprovalAction } from "../actions/approvals"

type WithdrawApprovalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  approvalId: string
  batchReference: string
}

export function WithdrawApprovalDialog({
  open,
  onOpenChange,
  approvalId,
  batchReference,
}: WithdrawApprovalDialogProps) {
  const withdraw = useAction(withdrawApprovalAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) onOpenChange(false)
    },
  })
  const errorMessage = withdraw.result.serverError
    ? "No se pudo retirar la solicitud."
    : withdraw.result.data?.ok === false
      ? (withdraw.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) withdraw.reset()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Retirar solicitud de {batchReference}</DialogTitle>
          <DialogDescription>
            La emisión vuelve a borrador. Puedes editarla y volver a solicitar
            la aprobación cuando quieras.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title="No se pudo retirar la solicitud"
            description={errorMessage}
          />
        )}

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
            variant="destructive"
            disabled={withdraw.isPending}
            onClick={() => withdraw.execute({ approvalId })}
          >
            Retirar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
