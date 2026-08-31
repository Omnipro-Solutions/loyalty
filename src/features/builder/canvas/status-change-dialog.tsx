"use client"

import { useState } from "react"

import { Field } from "@/components/form/field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ALLOWED_STATUS_TRANSITIONS,
  PUBLICATION_STATUS_DESCRIPTION,
  PUBLICATION_STATUS_LABEL,
  SELECTABLE_PUBLICATION_STATUSES,
  STATUS_CHANGE_REASON_LABEL,
  statusChangeNeedsNote,
  TRANSITION_VERB,
  type PublicationStatus,
  type SelectablePublicationStatus,
  type StatusChangeReason,
} from "@/lib/publication-status"
import { STATUS_CHANGE_REASONS } from "@/types/domain"

export type StatusChangePayload = {
  // `options` (más abajo) nunca ofrece `pendiente_aprobacion` — ni en modo
  // "publicar" (`SELECTABLE_PUBLICATION_STATUSES`) ni en "cambiar"
  // (`ALLOWED_STATUS_TRANSITIONS` nunca lo incluye como destino) — así que
  // este diálogo nunca puede producir ese valor.
  status: SelectablePublicationStatus
  reason: StatusChangeReason
  note: string
  /** Solo al publicar: la vigencia decide si el estado mostrado será Activa o Programada. */
  validFrom?: string
  validTo?: string | null
}

/**
 * Publicar una regla, y cambiarle el estado después. Un solo diálogo para
 * las dos cosas porque son la misma decisión con distinta pregunta previa:
 * al publicar se elige **con qué estado se cierra** (y su vigencia), y
 * después solo se elige a cuál de los estados permitidos se pasa.
 *
 * Tres reglas que este diálogo hace visibles, y que el módulo de
 * promociones ya aplica igual (`lib/publication-status.ts`):
 *
 * 1. **Ninguna transición vuelve a borrador.** Volver reabriría la edición
 *    de una regla que el motor ya evaluó. Por eso `borrador` solo aparece
 *    como estado inicial al publicar, nunca como destino.
 * 2. **No hay cambio de estado sin motivo.** El motivo es lo que hace
 *    auditable la bitácora: quién, cuándo y por qué. `Otro` exige la nota,
 *    porque por sí solo no explica nada.
 * 3. **Publicar bloquea la edición.** Se dice antes de confirmar, no
 *    después de descubrirlo.
 */
export function StatusChangeDialog({
  open,
  mode,
  currentStatus,
  currentValidFrom,
  currentValidTo,
  blockedReason,
  pending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  /** `publicar` = primera vez, elige estado inicial y vigencia. `cambiar` = transición sobre una regla ya publicada. */
  mode: "publicar" | "cambiar"
  currentStatus: PublicationStatus
  currentValidFrom: string
  currentValidTo: string | null
  /** Motivo por el que Publicar está bloqueado (grafo inválido) — se muestra y deshabilita el confirmar. */
  blockedReason?: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: StatusChangePayload) => void
}) {
  const transitions = ALLOWED_STATUS_TRANSITIONS[currentStatus]
  // `pendiente_aprobacion` nunca es una opción del cliente: no está en
  // `SELECTABLE_PUBLICATION_STATUSES` ni en ningún array de
  // `ALLOWED_STATUS_TRANSITIONS` — lo decide el servidor.
  const options: readonly PublicationStatus[] =
    mode === "publicar" ? SELECTABLE_PUBLICATION_STATUSES : transitions

  const [status, setStatus] = useState<SelectablePublicationStatus>(
    (options[0] as SelectablePublicationStatus | undefined) ?? "activa"
  )
  const [reason, setReason] = useState<StatusChangeReason>("decision_comercial")
  const [note, setNote] = useState("")
  const [validFrom, setValidFrom] = useState(currentValidFrom)
  const [validTo, setValidTo] = useState(currentValidTo ?? "")

  const needsNote = statusChangeNeedsNote(reason)
  const noteMissing = needsNote && !note.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "publicar"
              ? "Publicar la regla"
              : `${TRANSITION_VERB[status]} la regla`}
          </DialogTitle>
          <DialogDescription>
            {mode === "publicar" ? (
              <>
                Al publicar eliges con qué estado se cierra. Desde ese momento
                los bloques quedan de solo lectura y lo único editable es el
                estado.
              </>
            ) : (
              <>
                Pasará de <b>{PUBLICATION_STATUS_LABEL[currentStatus]}</b> a{" "}
                <b>{PUBLICATION_STATUS_LABEL[status]}</b>.{" "}
                {PUBLICATION_STATUS_DESCRIPTION[status]}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {blockedReason && (
            <p className="rounded-lg bg-destructive-bg px-3 py-2 text-[12px] leading-4 text-destructive">
              {blockedReason}
            </p>
          )}

          <Field
            label="Estado"
            required
            hint={PUBLICATION_STATUS_DESCRIPTION[status]}
            htmlFor="status-target"
          >
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as SelectablePublicationStatus)}
            >
              <SelectTrigger id="status-target" className="w-full">
                <SelectValue>
                  {(v: string) =>
                    PUBLICATION_STATUS_LABEL[v as PublicationStatus]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PUBLICATION_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {mode === "publicar" && (
            <>
              <Field label="Vigente desde" required htmlFor="valid-from">
                <Input
                  id="valid-from"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </Field>
              <Field
                label="Vigente hasta"
                hint="Con estado Activa y una fecha de inicio futura, la regla se muestra como Programada — ese estado se deriva, no se guarda."
                htmlFor="valid-to"
              >
                <Input
                  id="valid-to"
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                />
              </Field>
            </>
          )}

          <Field
            label="Motivo"
            required
            hint="El motivo es lo que hace auditable la bitácora: quién, cuándo y por qué."
            htmlFor="status-reason"
          >
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as StatusChangeReason)}
            >
              <SelectTrigger id="status-reason" className="w-full">
                <SelectValue>
                  {(v: string) =>
                    STATUS_CHANGE_REASON_LABEL[v as StatusChangeReason]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_CHANGE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {STATUS_CHANGE_REASON_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {needsNote && (
            <Field label="Describe el motivo" required htmlFor="status-note">
              <Textarea
                id="status-note"
                value={note}
                placeholder="Obligatorio cuando el motivo es «Otro»"
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending || !!blockedReason || noteMissing}
            onClick={() =>
              onConfirm({
                status,
                reason,
                note: note.trim(),
                ...(mode === "publicar"
                  ? { validFrom, validTo: validTo || null }
                  : {}),
              })
            }
          >
            {mode === "publicar"
              ? `Publicar como ${PUBLICATION_STATUS_LABEL[status]}`
              : `Confirmar y ${TRANSITION_VERB[status].toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
