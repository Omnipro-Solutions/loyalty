"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Field } from "@/components/form/field"
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
  approveApprovalAction,
  rejectApprovalAction,
} from "../actions/approvals"

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

  const action =
    decision === "approved" ? approveApprovalAction : rejectApprovalAction
  const decide = useAction(action, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      onOpenChange(false)
      setNote("")
      // Al aprobar, la generación de un batch_audience/batch_anonymous
      // grande sigue en el cliente — llevar al aprobador a ver la barra
      // de progreso en vez de dejarlo en la cola.
      if (decision === "approved" && "batchId" in data && data.batchId) {
        router.push(`/cupones/emisiones/${data.batchId}`)
      }
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

        <Field label="Nota (opcional)" htmlFor="decision-note">
          <Textarea
            id="decision-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isReject
                ? "Ej. Reduce la cantidad antes de volver a solicitar"
                : "Ej. Aprobado para la campaña de fin de mes"
            }
          />
        </Field>

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
              decide.execute({ approvalId, note: note || undefined })
            }
          >
            {isReject ? "Rechazar solicitud" : "Aprobar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
