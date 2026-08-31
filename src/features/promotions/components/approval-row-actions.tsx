"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"

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
import { Textarea } from "@/components/ui/textarea"

import {
  approvePromotionApprovalAction,
  rejectPromotionApprovalAction,
  withdrawPromotionApprovalAction,
} from "../actions/approvals"

type PromotionApprovalRowActionsProps = {
  approvalId: string
  promotionName: string
  /** Cuatro ojos también en la UI: quien solicitó solo ve "Retirar", nunca "Aprobar"/"Rechazar" sobre su propia solicitud (calco de `features/coupons/components/approval-row-actions.tsx`). */
  isOwnRequest: boolean
  canDecide: boolean
}

export function PromotionApprovalRowActions({
  approvalId,
  promotionName,
  isOwnRequest,
  canDecide,
}: PromotionApprovalRowActionsProps) {
  const router = useRouter()
  const [openDialog, setOpenDialog] = useState<
    "approve" | "reject" | "withdraw" | null
  >(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()

  function close() {
    setOpenDialog(null)
    setNote("")
    setError(undefined)
  }

  function onResult(data: { ok: boolean; message?: string } | undefined) {
    if (!data?.ok) {
      setError(data?.message ?? "No se pudo completar la acción.")
      return
    }
    close()
    router.refresh()
  }

  const approve = useAction(approvePromotionApprovalAction, {
    onSuccess: ({ data }) => onResult(data),
    onError: () => setError("No se pudo aprobar la solicitud."),
  })
  const reject = useAction(rejectPromotionApprovalAction, {
    onSuccess: ({ data }) => onResult(data),
    onError: () => setError("No se pudo rechazar la solicitud."),
  })
  const withdraw = useAction(withdrawPromotionApprovalAction, {
    onSuccess: ({ data }) => onResult(data),
    onError: () => setError("No se pudo retirar la solicitud."),
  })

  const pending = approve.isPending || reject.isPending || withdraw.isPending

  function confirm() {
    setError(undefined)
    if (openDialog === "approve") {
      approve.execute({ approvalId, note: note.trim() || undefined })
    } else if (openDialog === "reject") {
      reject.execute({ approvalId, note: note.trim() || undefined })
    } else if (openDialog === "withdraw") {
      withdraw.execute({ approvalId })
    }
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
                «{promotionName}» volverá a Borrador y podrás editarla de nuevo.
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

      <Dialog
        open={openDialog === "approve" || openDialog === "reject"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openDialog === "approve" ? "Aprobar" : "Rechazar"} la solicitud
            </DialogTitle>
            <DialogDescription>
              «{promotionName}» —{" "}
              {openDialog === "approve"
                ? "pasará a Activa."
                : "volverá a Borrador y se podrá editar de nuevo."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={280}
          />
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
                : openDialog === "approve"
                  ? "Aprobar"
                  : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
