"use client"

import { LogOut, UserRound } from "lucide-react"
import Link from "next/link"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { UserCard } from "@/components/layout/user-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLogout } from "@/hooks/use-logout"
import { cn } from "@/lib/utils"

type UserMenuProps = {
  name: string
  email: string
  /** "card": envuelve `UserCard` (sidebar expandido). "compact": solo el avatar (rail colapsado). */
  variant?: "card" | "compact"
  className?: string
}

/**
 * Menú de cuenta accesible desde el usuario del sidebar: "Ver perfil" y
 * "Cerrar sesión". Sin nodo propio en el Figma — sigue los tokens y el
 * patrón de `dropdown-menu.tsx` ya usado en el resto de la app.
 */
export function UserMenu({
  name,
  email,
  variant = "card",
  className,
}: UserMenuProps) {
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        render={<div />}
        className={cn(
          "cursor-pointer rounded-[16px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:ring-2 data-popup-open:ring-ring/50",
          variant === "card" && "w-full",
          className
        )}
      >
        {variant === "card" ? (
          <UserCard name={name} email={email} />
        ) : (
          <AvatarInitials name={name} size={32} />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={variant === "card" ? "start" : "end"}
        side={variant === "card" ? "top" : "right"}
        className="w-64"
      >
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          <p className="truncate text-[13px] font-semibold text-foreground">
            {name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/perfil" />}>
          <UserRound /> Ver perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onClick={() => logout.execute()}
        >
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
