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

import { resendCouponAction } from "../actions/coupons"

type ResendCouponDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  couponId: string
  couponCode: string
}

/** Sin sender real de email/SMS (ver `docs/cupones.md` §4.3) — reenviar solo registra el evento `delivered` en el log, así que el diálogo lo dice explícitamente en vez de simular un envío. */
export function ResendCouponDialog({
  open,
  onOpenChange,
  couponId,
  couponCode,
}: ResendCouponDialogProps) {
  const resend = useAction(resendCouponAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) onOpenChange(false)
    },
  })
  const errorMessage = resend.result.serverError
    ? "No se pudo reenviar el cupón."
    : resend.result.data?.ok === false
      ? (resend.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resend.reset()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reenviar {couponCode}</DialogTitle>
          <DialogDescription>
            Este proyecto no tiene un proveedor de email/SMS conectado — no se
            envía ningún mensaje real. Se registrará un evento «Entregado» en el
            log del cupón.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title="No se pudo reenviar el cupón"
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
            disabled={resend.isPending}
            onClick={() => resend.execute({ couponId })}
          >
            Registrar reenvío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
