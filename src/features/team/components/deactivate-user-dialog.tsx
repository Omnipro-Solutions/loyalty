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

import { setUserStatusAction } from "../actions/users"

type DeactivateUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
  userName: string
}

/** Molde de `ApprovalDecisionDialog` (features/coupons). */
export function DeactivateUserDialog({
  open,
  onOpenChange,
  profileId,
  userName,
}: DeactivateUserDialogProps) {
  const router = useRouter()

  const deactivate = useAction(setUserStatusAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      onOpenChange(false)
      router.refresh()
    },
  })
  const errorMessage = deactivate.result.serverError
    ? "No se pudo desactivar el usuario."
    : deactivate.result.data?.ok === false
      ? (deactivate.result.data.message ?? "Intenta de nuevo.")
      : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) deactivate.reset()
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Desactivar a {userName}</DialogTitle>
          <DialogDescription>
            No podrá iniciar sesión hasta que lo actives de nuevo. Una sesión ya
            abierta se cierra en su próxima navegación.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Message
            variant="error"
            title="No se pudo desactivar"
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
            disabled={deactivate.isPending}
            onClick={() =>
              deactivate.execute({ profileId, status: "inactivo" })
            }
          >
            {deactivate.isPending ? "Desactivando…" : "Desactivar usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
