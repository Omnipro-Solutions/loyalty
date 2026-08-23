"use client"

import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLogout } from "@/hooks/use-logout"

export function LogoutButton() {
  const logout = useLogout()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={logout.isPending}
      onClick={() => logout.execute()}
    >
      <LogOut /> Cerrar sesión
    </Button>
  )
}
