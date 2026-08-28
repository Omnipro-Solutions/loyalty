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

import { revokeUserDevicesAction } from "../actions/users"

type RevokeUserDevicesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
  devicesCount: number
}

export function RevokeUserDevicesDialog({
  open,
  onOpenChange,
  profileId,
  devicesCount,
}: RevokeUserDevicesDialogProps) {
  const router = useRouter()

  const revoke = useAction(revokeUserDevicesAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      onOpenChange(false)
      router.refresh()
    },
  })
  const errorMessage = revoke.result.serverError
    ? "No se pudieron revocar los dispositivos."
    : revoke.result.data?.ok === false
      ? (revoke.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) revoke.reset()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Revocar {devicesCount} dispositivo{devicesCount === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            La próxima vez que inicie sesión en cualquiera de ellos, va a tener
            que completar la verificación en dos pasos de nuevo.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title="No se pudo revocar"
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
            disabled={revoke.isPending}
            onClick={() => revoke.execute({ profileId })}
          >
            {revoke.isPending ? "Revocando…" : "Revocar todos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
