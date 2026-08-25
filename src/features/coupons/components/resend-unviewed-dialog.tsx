"use client"

import { useAction } from "next-safe-action/hooks"
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
  DialogTrigger,
} from "@/components/ui/dialog"

import { resendUnviewedAction } from "../actions/batches"

type ResendUnviewedDialogProps = { batchId: string }

export function ResendUnviewedDialog({ batchId }: ResendUnviewedDialogProps) {
  const [open, setOpen] = useState(false)
  const resend = useAction(resendUnviewedAction)
  const errorMessage = resend.result.serverError
    ? "No se pudo registrar el reenvío."
    : resend.result.data?.ok === false
      ? (resend.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resend.reset()
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded-[10px] border border-border bg-background px-3.5 py-2 text-xs font-medium text-secondary-foreground"
          />
        }
      >
        Reenviar no vistos
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reenviar cupones no vistos</DialogTitle>
          <DialogDescription>
            Este proyecto no tiene un proveedor de email/SMS conectado — no se
            envía ningún mensaje real. Se registrará un evento «Entregado» para
            cada cupón de esta emisión que todavía no fue visto.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title="No se pudo reenviar"
            description={errorMessage}
          />
        )}
        {resend.result.data?.ok === true && (
          <Message
            variant="success"
            title="Reenvío registrado"
            description={`Se registró el evento en ${resend.result.data.count} cupón${resend.result.data.count === 1 ? "" : "es"}.`}
          />
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cerrar
          </Button>
          <Button
            type="button"
            disabled={resend.isPending}
            onClick={() => resend.execute({ batchId })}
          >
            Registrar reenvío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
