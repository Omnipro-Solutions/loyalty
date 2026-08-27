"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Field } from "@/components/form/field"
import { Message } from "@/components/form/message"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { formatNumber } from "@/lib/format"
import {
  COUPON_CANCEL_REASON_CODES,
  COUPON_CANCEL_REASONS_REQUIRING_NOTE,
  type CouponCancelReasonCode,
} from "@/types/domain"

import { voidCouponAction } from "../actions/coupons"
import { COUPON_CANCEL_REASON_LABEL } from "../lib/labels"

/** Cuántas anulaciones van por tanda — mismo criterio que el borrado de borradores de Promociones. */
const VOID_BATCH_SIZE = 10

type CouponsVoidDialogProps = {
  /** Cupones a anular — uno desde el menú de la fila, varios desde la barra de selección. */
  ids: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onVoided: () => void
}

type Progress = { done: number; total: number }

/**
 * Anulación de cupones desde el listado, en tandas de `VOID_BATCH_SIZE` con
 * barra de avance — mismo patrón que `PromotionDeleteDialog`.
 *
 * Reusa `voidCouponAction` cupón a cupón en vez de una acción masiva nueva:
 * esa acción ya resuelve la devolución de puntos, el evento de auditoría con
 * IP y el asiento en `points_ledger`. Duplicar esa lógica para procesar en
 * bloque sería tener dos versiones de la regla más delicada del módulo.
 */
export function CouponsVoidDialog({
  ids,
  open,
  onOpenChange,
  onVoided,
}: CouponsVoidDialogProps) {
  const router = useRouter()
  const [reasonCode, setReasonCode] =
    useState<CouponCancelReasonCode>("issued_in_error")
  const [reasonNote, setReasonNote] = useState("")
  const [refundPoints, setRefundPoints] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState<string>()
  const [failed, setFailed] = useState<string[]>([])
  const [voided, setVoided] = useState(0)

  const voidCoupon = useAction(voidCouponAction)
  const requiresNote = COUPON_CANCEL_REASONS_REQUIRING_NOTE.includes(reasonCode)

  function close() {
    onOpenChange(false)
    setProgress(null)
    setError(undefined)
    setFailed([])
    setVoided(0)
    setReasonNote("")
    setRefundPoints(false)
    setReasonCode("issued_in_error")
  }

  async function confirm() {
    const note = reasonNote.trim()
    if (requiresNote && !note) {
      setError("La nota es obligatoria para este motivo.")
      return
    }
    setError(undefined)
    setFailed([])

    let done = 0
    let ok = 0
    const errors: string[] = []
    setProgress({ done: 0, total: ids.length })

    // Tandas de 10 en paralelo: cada cupón es una escritura independiente
    // (estado + evento + puntos), pero lanzar 300 a la vez no ayudaría.
    for (let i = 0; i < ids.length; i += VOID_BATCH_SIZE) {
      const batch = ids.slice(i, i + VOID_BATCH_SIZE)
      const results = await Promise.all(
        batch.map((couponId) =>
          voidCoupon.executeAsync({
            couponId,
            reasonCode,
            reasonNote: note || undefined,
            refundPoints,
          })
        )
      )
      for (const result of results) {
        if (result?.data?.ok) ok += 1
        else if (result?.data?.message) errors.push(result.data.message)
        else errors.push("No se pudo anular el cupón.")
      }
      done += batch.length
      setProgress({ done, total: ids.length })
    }

    setVoided(ok)
    // Se agrupan los mensajes repetidos: 40 veces "ya está anulado" no
    // aporta más que "40 × ya está anulado".
    const grouped = [...new Set(errors)].map((message) => {
      const times = errors.filter((e) => e === message).length
      return times > 1 ? `${times} × ${message}` : message
    })
    setFailed(grouped)
    router.refresh()

    if (grouped.length === 0) {
      onVoided()
      onOpenChange(false)
    }
  }

  const count = ids.length
  const running = progress !== null && voidCoupon.isPending
  const percent = progress
    ? Math.round((progress.done / Math.max(progress.total, 1)) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {count === 1 ? "Anular el cupón" : `Anular ${count} cupones`}
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? "¿Seguro que quieres anularlo?"
              : `¿Seguro que quieres anular ${count} cupones?`}{" "}
            <strong>Es definitivo:</strong> dejan de poder canjearse. Queda
            registrado en el log de auditoría con tu usuario, la hora y tu IP.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          <Field label="Motivo" htmlFor="voidReason" required>
            <Select
              value={reasonCode}
              onValueChange={(v) => setReasonCode(v as CouponCancelReasonCode)}
            >
              <SelectTrigger id="voidReason">
                <SelectValue>
                  {(v: CouponCancelReasonCode) => COUPON_CANCEL_REASON_LABEL[v]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {COUPON_CANCEL_REASON_CODES.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {COUPON_CANCEL_REASON_LABEL[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Nota"
            htmlFor="voidNote"
            required={requiresNote}
            hint={
              requiresNote
                ? "Obligatoria para este motivo."
                : "Opcional — se guarda con el evento de auditoría."
            }
          >
            <Textarea
              id="voidNote"
              rows={3}
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Ej.: emitidos por error en la carga del 26/08."
            />
          </Field>

          <label className="flex items-start gap-2.5">
            <Checkbox
              checked={refundPoints}
              onCheckedChange={(checked) => setRefundPoints(checked === true)}
            />
            <span className="text-xs leading-4 text-secondary-foreground">
              Devolver los puntos al cliente.{" "}
              <span className="text-muted-foreground">
                Solo se aplica a los cupones que se pagaron con puntos y aún no
                se han devuelto.
              </span>
            </span>
          </label>

          {progress && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Anulando en tandas de {VOID_BATCH_SIZE}…</span>
                <span className="tabular-nums">
                  {formatNumber(progress.done)} / {formatNumber(progress.total)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {failed.length > 0 && (
            <Message
              variant="warning"
              title={`${formatNumber(voided)} anulados · ${formatNumber(failed.length)} sin anular`}
              description={failed.join(" · ")}
            />
          )}

          {error && (
            <Message
              variant="error"
              title="No se pudo anular"
              description={error}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={running}
          >
            {failed.length > 0 ? "Cerrar" : "Cancelar"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={running}
          >
            {running
              ? "Anulando…"
              : count === 1
                ? "Anular cupón"
                : `Anular ${count}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
