"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"

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

import { resetUserMfaAction } from "../actions/users"

type ResetUserMfaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
}

export function ResetUserMfaDialog({
  open,
  onOpenChange,
  profileId,
}: ResetUserMfaDialogProps) {
  const router = useRouter()

  const reset = useAction(resetUserMfaAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      onOpenChange(false)
      router.refresh()
    },
  })
  const errorMessage = reset.result.serverError
    ? "No se pudo restablecer el 2FA."
    : reset.result.data?.ok === false
      ? (reset.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset.reset()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Restablecer verificación en dos pasos</DialogTitle>
          <DialogDescription>
            Borra sus factores verificados y sus códigos de respaldo — tendrá
            que enrolar de nuevo en su próximo inicio de sesión. También cierra
            sus sesiones activas y revoca sus dispositivos de confianza.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title="No se pudo restablecer"
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
            variant="destructive"
            disabled={reset.isPending}
            onClick={() => reset.execute({ profileId })}
          >
            {reset.isPending ? "Restableciendo…" : "Restablecer 2FA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
