"use client"

import { useAction } from "next-safe-action/hooks"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

import { revokeTrustedDeviceAction } from "../actions/revoke-device"

export function RevokeDeviceButton({ id }: { id: string }) {
  const router = useRouter()
  const revoke = useAction(revokeTrustedDeviceAction, {
    onSuccess: () => router.refresh(),
  })

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={revoke.isPending}
      onClick={() => revoke.execute({ id })}
    >
      Revocar
    </Button>
  )
}
