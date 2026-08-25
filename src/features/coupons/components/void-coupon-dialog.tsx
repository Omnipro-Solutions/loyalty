"use client"

import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAction } from "next-safe-action/hooks"
import { useForm, useWatch } from "react-hook-form"
import type { z } from "zod"

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
import { RadioGroup } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  COUPON_CANCEL_REASON_CODES,
  COUPON_CANCEL_REASONS_REQUIRING_NOTE,
  type CouponCancelReasonCode,
  type CouponOrigin,
} from "@/types/domain"

import { voidCouponAction } from "../actions/coupons"
import { COUPON_CANCEL_REASON_LABEL, COUPON_ORIGIN_LABEL } from "../lib/labels"
import { cancelCouponBaseSchema, refineCancelReasonNote } from "../schemas"

const voidCouponFormSchema = cancelCouponBaseSchema
  .omit({ couponId: true })
  .superRefine(refineCancelReasonNote)
type VoidCouponValues = z.input<typeof voidCouponFormSchema>

type VoidCouponDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  couponId: string
  couponCode: string
  canRefundPoints: boolean
  origin: CouponOrigin
}

/** Figma 13.5 "Cupones · anular cupón" (1386:4673). */
export function VoidCouponDialog({
  open,
  onOpenChange,
  couponId,
  couponCode,
  canRefundPoints,
  origin,
}: VoidCouponDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<VoidCouponValues>({
    resolver: zodResolver(voidCouponFormSchema),
    defaultValues: {
      reasonCode: "issued_in_error",
      reasonNote: "",
      refundPoints: false,
    },
  })

  const values = useWatch({ control })
  const requiresNote = COUPON_CANCEL_REASONS_REQUIRING_NOTE.includes(
    values.reasonCode as CouponCancelReasonCode
  )

  const voidCoupon = useAction(voidCouponAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        onOpenChange(false)
        reset()
      }
    },
  })
  const errorMessage = voidCoupon.result.serverError
    ? "No se pudo anular el cupón."
    : voidCoupon.result.data?.ok === false
      ? (voidCoupon.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          voidCoupon.reset()
          reset()
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anular cupón {couponCode}</DialogTitle>
          <DialogDescription>
            El cupón pasa a estado «Anulado» de forma definitiva y deja de poder
            canjearse. Queda registrado en el log de auditoría con tu usuario,
            la hora y tu IP.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title="No se pudo anular el cupón"
            description={errorMessage}
          />
        )}

        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((formValues) =>
            voidCoupon.execute({ couponId, ...formValues })
          )}
        >
          <Field label="Motivo de la anulación" required>
            <RadioGroup
              value={values.reasonCode}
              onValueChange={(v) =>
                setValue("reasonCode", v as CouponCancelReasonCode)
              }
              className="flex flex-col gap-2"
            >
              {COUPON_CANCEL_REASON_CODES.map((code) => {
                const checked = values.reasonCode === code
                return (
                  <RadioPrimitive.Root
                    key={code}
                    value={code}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                      checked
                        ? "border-destructive bg-destructive-bg"
                        : "border-border bg-background"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "relative size-[18px] shrink-0 rounded-full border-[1.5px]",
                          checked
                            ? "border-[5.5px] border-destructive"
                            : "border-border-strong"
                        )}
                      />
                      <span className="text-[13px] font-medium text-foreground">
                        {COUPON_CANCEL_REASON_LABEL[code]}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {code}
                    </span>
                  </RadioPrimitive.Root>
                )
              })}
            </RadioGroup>
          </Field>

          <Field
            label="Nota"
            required={requiresNote}
            htmlFor="void-reason-note"
            hint="Obligatoria para «Sospecha de fraude» y «Otro»."
            error={errors.reasonNote?.message}
          >
            <Textarea id="void-reason-note" {...register("reasonNote")} />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                Devolver los puntos al cliente
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {canRefundPoints
                  ? "Los puntos cobrados por este cupón se devolverán al saldo del cliente."
                  : `Este cupón no consumió puntos (origen: ${COUPON_ORIGIN_LABEL[origin]}). El interruptor solo aplica a canjes de puntos.`}
              </p>
            </div>
            <Switch
              checked={values.refundPoints}
              disabled={!canRefundPoints}
              onCheckedChange={(v) => setValue("refundPoints", v)}
            />
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <p className="text-[11px] text-muted-foreground">
              Acción irreversible
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={voidCoupon.isPending}
              >
                Anular cupón
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
