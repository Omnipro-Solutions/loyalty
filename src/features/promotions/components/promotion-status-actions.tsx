"use client"

import {
  ChevronDown,
  CirclePause,
  CircleCheck,
  Flag,
  type LucideIcon,
} from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  PROMOTION_STATUS_CHANGE_REASONS,
  type PromotionPublicationStatus,
  type PromotionStatusChangeReason,
  type SelectablePublicationStatus,
} from "@/types/domain"

import { updatePromotionStatusAction } from "../actions/promotions"
import {
  PROMOTION_PUBLICATION_STATUS_DESCRIPTION,
  PROMOTION_STATUS_CHANGE_REASON_LABEL,
  PROMOTION_STATUS_DOT,
  PROMOTION_STATUS_LABEL,
} from "../lib/labels"
import { ALLOWED_STATUS_TRANSITIONS, type PromotionStatus } from "../lib/status"

/** Verbo de la acción, no nombre del estado: el botón es una orden ("Inactivar"), la insignia es un estado ("Inactiva"). */
const TRANSITION_VERB: Record<PromotionPublicationStatus, string> = {
  borrador: "Volver a borrador",
  // Nunca se ofrece como botón (ver `ALLOWED_STATUS_TRANSITIONS` en
  // `lib/publication-status.ts`): el servidor decide por su cuenta cuándo
  // una promoción cae en este estado. El valor existe solo para que el mapa
  // sea exhaustivo.
  pendiente_aprobacion: "Enviar a aprobación",
  activa: "Reactivar",
  inactiva: "Inactivar",
  finalizada: "Finalizar",
}

const TRANSITION_ICON: Record<PromotionPublicationStatus, LucideIcon> = {
  borrador: CirclePause,
  pendiente_aprobacion: CirclePause,
  activa: CircleCheck,
  inactiva: CirclePause,
  finalizada: Flag,
}

type PromotionStatusActionsProps = {
  promotionId: string
  /** Estado guardado en `estado_publicacion` — el que se puede cambiar. */
  savedStatus: PromotionPublicationStatus
  /** Estado que ve el usuario en el listado: incluye `programada`, derivado de las fechas. */
  displayStatus: PromotionStatus
}

/**
 * Cuadrante "Estado de la promoción" de una promoción ya publicada: la
 * insignia del estado actual y un único botón de acción con las
 * transiciones posibles (Inactivar / Finalizar / Reactivar). Cada una abre
 * un diálogo que exige el motivo antes de confirmar — el motivo es lo que
 * hace auditable la bitácora ("quién, cuándo y por qué"), así que no hay
 * cambio de estado sin él.
 */
export function PromotionStatusActions({
  promotionId,
  savedStatus,
  displayStatus,
}: PromotionStatusActionsProps) {
  const router = useRouter()
  const [target, setTarget] = useState<PromotionPublicationStatus | null>(null)
  const [reasonCode, setReasonCode] =
    useState<PromotionStatusChangeReason>("decision_comercial")
  const [reasonNote, setReasonNote] = useState("")
  const [error, setError] = useState<string>()

  const update = useAction(updatePromotionStatusAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) {
        setError(data?.message ?? "No se pudo cambiar el estado.")
        return
      }
      close()
      // La página es un Server Component: sin `refresh` la insignia, la
      // bitácora y el bloqueo de campos seguirían mostrando el estado viejo.
      router.refresh()
    },
    onError: () => setError("No se pudo cambiar el estado."),
  })

  function open(next: PromotionPublicationStatus) {
    setTarget(next)
    setReasonCode("decision_comercial")
    setReasonNote("")
    setError(undefined)
  }

  function close() {
    setTarget(null)
    setError(undefined)
  }

  function confirm() {
    if (!target) return
    const note = reasonNote.trim()
    if (reasonCode === "otro" && !note) {
      setError("Describe el motivo para poder registrar el cambio.")
      return
    }
    setError(undefined)
    update.execute({
      id: promotionId,
      // `target` solo se asigna desde `ALLOWED_STATUS_TRANSITIONS`, que
      // nunca incluye `pendiente_aprobacion` como destino — el cast es
      // seguro; si algún día dejara de serlo, la acción lo rechazaría igual
      // por el `z.enum(SELECTABLE_PUBLICATION_STATUSES)` de su schema.
      publicationStatus: target as SelectablePublicationStatus,
      reasonCode,
      reasonNote: note || undefined,
    })
  }

  // Nunca se ofrece volver a `borrador`: reabriría la edición de una
  // promoción ya publicada (ver `ALLOWED_STATUS_TRANSITIONS`).
  const transitions = ALLOWED_STATUS_TRANSITIONS[savedStatus].filter(
    (status) => status !== "borrador"
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            PROMOTION_STATUS_DOT[displayStatus]
          )}
        />
        <div className="flex flex-col">
          <p className="text-[15px] leading-5 font-semibold text-foreground">
            {PROMOTION_STATUS_LABEL[displayStatus]}
          </p>
          <p className="text-[11px] leading-4 text-muted-foreground">
            {displayStatus === "programada"
              ? "Activa, pero su vigencia empieza más adelante."
              : PROMOTION_PUBLICATION_STATUS_DESCRIPTION[savedStatus]}
          </p>
        </div>
      </div>

      {transitions.length > 0 && (
        <DropdownMenu>
          {/* `type="button"` explícito: este disparador vive dentro del `<form>` del wizard y un submit accidental recargaría la página. */}
          <DropdownMenuTrigger
            render={<Button type="button" variant="outline" />}
          >
            Cambiar estado
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          {/* `w-auto` por lo mismo que en `promotions-table.tsx`: el menú hereda el ancho del botón y parte las etiquetas. */}
          <DropdownMenuContent align="end" className="w-auto min-w-[180px]">
            {transitions.map((status) => {
              const Icon = TRANSITION_ICON[status]
              return (
                <DropdownMenuItem key={status} onClick={() => open(status)}>
                  <Icon className="size-4" />
                  <span className="whitespace-nowrap">
                    {TRANSITION_VERB[status]}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={target !== null} onOpenChange={(next) => !next && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target ? TRANSITION_VERB[target] : ""} la promoción
            </DialogTitle>
            <DialogDescription>
              ¿Confirmas el cambio? Pasará de{" "}
              <strong>{PROMOTION_STATUS_LABEL[savedStatus]}</strong> a{" "}
              <strong>{target ? PROMOTION_STATUS_LABEL[target] : ""}</strong>.
              El motivo queda registrado en la bitácora junto a tu nombre y la
              fecha.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5">
            <Field label="Motivo" htmlFor="reasonCode" required>
              <Select
                value={reasonCode}
                onValueChange={(v) =>
                  setReasonCode(v as PromotionStatusChangeReason)
                }
              >
                <SelectTrigger id="reasonCode">
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
              htmlFor="reasonNote"
              required={reasonCode === "otro"}
              hint="Opcional, salvo que el motivo sea «Otro». Máximo 280 caracteres."
            >
              <Textarea
                id="reasonNote"
                rows={3}
                maxLength={280}
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Ej.: se agotó el presupuesto del trimestre."
              />
            </Field>

            {error && (
              <Message
                variant="error"
                title="No se pudo cambiar el estado"
                description={error}
              />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirm} disabled={update.isPending}>
              {update.isPending
                ? "Guardando…"
                : `Confirmar y ${target ? TRANSITION_VERB[target].toLowerCase() : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
