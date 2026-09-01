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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  PROMOTION_STATUS_CHANGE_REASONS,
  type PromotionStatusChangeReason,
} from "@/types/domain"

import { activatePromotionsAction } from "../actions/promotions"
import { PROMOTION_STATUS_CHANGE_REASON_LABEL } from "../lib/labels"

type PromotionActivateDialogProps = {
  /** Promociones a activar — una desde el menú de la fila, varias desde la barra de selección. */
  ids: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama al terminar con éxito, para limpiar la selección. */
  onActivated: () => void
}

/**
 * Confirmación de "Activar" con su motivo, compartida por la activación
 * masiva y la de una sola fila: el mismo diálogo para las dos evita que la
 * bitácora tenga dos calidades de dato según por dónde se activó.
 */
export function PromotionActivateDialog({
  ids,
  open,
  onOpenChange,
  onActivated,
}: PromotionActivateDialogProps) {
  const router = useRouter()
  const [reasonCode, setReasonCode] =
    useState<PromotionStatusChangeReason>("decision_comercial")
  const [reasonNote, setReasonNote] = useState("")
  const [error, setError] = useState<string>()
  const [skipped, setSkipped] = useState<{ name: string; reason: string }[]>([])

  const activate = useAction(activatePromotionsAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setError(data?.message ?? "No se pudieron activar las promociones.")
        return
      }
      // Las omitidas se muestran en el propio diálogo en vez de cerrarlo en
      // silencio: es la única forma de enterarse de que alguna no se activó.
      if (
        data.skipped.length > 0 &&
        data.activated === 0 &&
        data.sentToApproval === 0
      ) {
        setSkipped(data.skipped)
        router.refresh()
        return
      }
      onActivated()
      onOpenChange(false)
      router.refresh()
    },
    onError: () => setError("No se pudieron activar las promociones."),
  })

  function close() {
    onOpenChange(false)
    setError(undefined)
    setSkipped([])
    setReasonNote("")
    setReasonCode("decision_comercial")
  }

  function confirm() {
    const note = reasonNote.trim()
    if (reasonCode === "otro" && !note) {
      setError("Describe el motivo para poder registrar la activación.")
      return
    }
    setError(undefined)
    setSkipped([])
    activate.execute({ ids, reasonCode, reasonNote: note || undefined })
  }

  const count = ids.length

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {count === 1
              ? "Activar la promoción"
              : `Activar ${count} promociones`}
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? "Pasará a Pendiente de aprobación, no a Activa: publicar exige la firma de otra persona. Se activa sola en cuanto alguien apruebe la solicitud."
              : `Las ${count} pasarán a Pendiente de aprobación, cada una con su propia solicitud para que se decidan por separado. Las que ya estén publicadas se omiten.`}{" "}
            El motivo queda en la bitácora de cada promoción junto a tu nombre y
            la fecha.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          <Field label="Motivo" htmlFor="activateReason" required>
            <Select
              value={reasonCode}
              onValueChange={(v) =>
                setReasonCode(v as PromotionStatusChangeReason)
              }
            >
              <SelectTrigger id="activateReason">
                <SelectValue>
                  {(v: PromotionStatusChangeReason) =>
                    PROMOTION_STATUS_CHANGE_REASON_LABEL[v]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROMOTION_STATUS_CHANGE_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {PROMOTION_STATUS_CHANGE_REASON_LABEL[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Nota"
            htmlFor="activateNote"
            required={reasonCode === "otro"}
            hint="Opcional, salvo que el motivo sea «Otro». Máximo 280 caracteres."
          >
            <Textarea
              id="activateNote"
              rows={3}
              maxLength={280}
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Ej.: revisadas tras la importación del 26/08."
            />
          </Field>

          {skipped.length > 0 && (
            <Message
              variant="warning"
              title="No se activó ninguna"
              description={skipped
                .map((s) => `${s.name} — ${s.reason}`)
                .join(" · ")}
            />
          )}

          {error && (
            <Message
              variant="error"
              title="No se pudo activar"
              description={error}
            />
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={activate.isPending}>
            {activate.isPending
              ? "Activando…"
              : count === 1
                ? "Activar promoción"
                : `Activar ${count}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
