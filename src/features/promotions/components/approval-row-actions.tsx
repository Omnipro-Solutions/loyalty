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
import { type DecisionReason } from "@/types/domain"

import {
  decidePromotionApprovalsAction,
  withdrawPromotionApprovalAction,
} from "../actions/approvals"

type PromotionApprovalRowActionsProps = {
  approvalId: string
  promotionName: string
  /** Cuatro ojos también en la UI: quien solicitó solo ve "Retirar", nunca "Aprobar"/"Rechazar" sobre su propia solicitud — salvo `canSelfApprove`. */
  isOwnRequest: boolean
  canDecide: boolean
  /** `promociones:autoaprobar`: la excepción opt-in que deja firmar lo propio (ver `approvalBlock` en `lib/approval-flow.ts`). */
  canSelfApprove: boolean
}

/**
 * Acciones de una fila de la bandeja. Usa la MISMA acción en bloque que la
 * barra de selección, con un solo id: así el motivo y la regla de cuatro
 * ojos se aplican igual se decida de una en una o de doce en doce.
 */
export function PromotionApprovalRowActions({
  approvalId,
  promotionName,
  isOwnRequest,
  canDecide,
  canSelfApprove,
}: PromotionApprovalRowActionsProps) {
  const router = useRouter()
  const [openDialog, setOpenDialog] = useState<
    "approved" | "rejected" | "withdraw" | null
  >(null)
  // Sin motivo preseleccionado: ver `DecisionReasonFields`.
  const [reasonCode, setReasonCode] = useState<DecisionReason | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()

  function close() {
    setOpenDialog(null)
    setNote("")
    setError(undefined)
  }

  function openDecision(decision: "approved" | "rejected") {
    setReasonCode(null)
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

  const decide = useAction(decidePromotionApprovalsAction, {
    onSuccess: ({ data }) => onResult(data),
    onError: () => setError("No se pudo completar la decisión."),
  })
  const withdraw = useAction(withdrawPromotionApprovalAction, {
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
    // El motivo no viene preseleccionado, así que puede faltar: el botón ya
    // está deshabilitado, esto es la red por si se envía con el teclado.
    if (!reasonCode) {
      setError("Elige un motivo para dejar constancia de la decisión.")
      return
    }
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

  // Lo único que deja decidir una solicitud propia es `autoaprobar` (mismo
  // criterio que `approvalBlock` y que `can_self_approve()` en SQL). Sin él,
  // sobre lo tuyo solo queda Retirar — y con él quedan las dos cosas: firmar
  // o retirar siguen siendo decisiones distintas.
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
      {isOwnRequest && (
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
      )}

      {canDecideThis && (
        <button
          type="button"
          className="text-xs font-medium text-destructive"
          onClick={() => openDecision("rejected")}
        >
          Rechazar
        </button>
      )}
      {canDecideThis && (
        <button
          type="button"
          className="text-xs font-medium text-primary"
          onClick={() => openDecision("approved")}
        >
          Aprobar
        </button>
      )}

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
              «{promotionName}» —{" "}
              {openDialog === "approved"
                ? "pasará a Activa."
                : "volverá a Borrador y se podrá editar de nuevo."}
              {/* Que la autoaprobación se sienta como lo que es. La huella
                  queda igual en la fila (`approver_id = requested_by`), pero
                  decirlo antes de firmar es la diferencia entre un permiso
                  concedido y un permiso olvidado. */}
              {isOwnRequest &&
                " Es tu propia solicitud: quedará registrada como autoaprobación."}
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
            <Button
              type="button"
              onClick={confirm}
              disabled={pending || !reasonCode}
            >
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
