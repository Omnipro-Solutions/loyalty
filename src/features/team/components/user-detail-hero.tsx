"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Message } from "@/components/form/message"
import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  sendUserPasswordResetAction,
  setUserStatusAction,
} from "../actions/users"
import { DeactivateUserDialog } from "./deactivate-user-dialog"
import { avatarPalette } from "../lib/avatar-palette"
import type { User } from "../lib/queries"

type UserDetailHeroProps = {
  user: User
  canManage: boolean
  isSelf: boolean
}

export function UserDetailHero({
  user,
  canManage,
  isSelf,
}: UserDetailHeroProps) {
  const router = useRouter()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const palette = avatarPalette(user.id)
  const active = user.estado === "activo"

  const resetPassword = useAction(sendUserPasswordResetAction)
  const activate = useAction(setUserStatusAction, {
    onSuccess: ({ data }) => {
      if (data?.ok) router.refresh()
    },
  })

  const resetSent = resetPassword.result.data?.ok === true

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3.5 rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
        <AvatarInitials
          name={user.nombre}
          size={56}
          bgClassName={palette.bg}
          fgClassName={palette.fg}
          textClassName="text-lg"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-foreground">
              {user.nombre}
            </p>
            <Badge variant="info">{user.role.nombre}</Badge>
            <Badge variant={active ? "success" : "neutral"}>
              {active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        {canManage && !isSelf && (
          <div className="flex shrink-0 items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={resetPassword.isPending || resetSent}
              onClick={() => resetPassword.execute({ profileId: user.id })}
            >
              {resetSent ? "Correo enviado" : "Restablecer contraseña"}
            </Button>
            {active ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeactivateOpen(true)}
              >
                Desactivar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={activate.isPending}
                onClick={() =>
                  activate.execute({ profileId: user.id, status: "activo" })
                }
              >
                Activar
              </Button>
            )}
          </div>
        )}
      </div>

      {resetPassword.result.data?.ok === false && (
        <Message
          variant="error"
          title="No se pudo enviar el correo"
          description={resetPassword.result.data.message ?? "Intenta de nuevo."}
        />
      )}
      {activate.result.data?.ok === false && (
        <Message
          variant="error"
          title="No se pudo activar"
          description={activate.result.data.message ?? "Intenta de nuevo."}
        />
      )}

      <DeactivateUserDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        profileId={user.id}
        userName={user.nombre}
      />
    </div>
  )
}
