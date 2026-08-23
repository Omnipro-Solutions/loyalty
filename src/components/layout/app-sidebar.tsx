"use client"

import { PanelLeftClose } from "lucide-react"

import { BrandMark } from "@/components/layout/brand-mark"
import { NavGroup } from "@/components/layout/nav-group"
import { NavItem } from "@/components/layout/nav-item"
import { UserMenu } from "@/components/layout/user-menu"
import { Button } from "@/components/ui/button"
import { NAVIGATION } from "@/config/navigation"
import { cn } from "@/lib/utils"

type AppSidebarProps = {
  nombre: string
  email: string
  onCollapse?: () => void
  className?: string
}

/**
 * Figma "Layout / Sidebar" (624:561): 260px, p-12 gap-8, bg-white. El Figma
 * no dibuja un botón para volver al rail colapsado (680:230) desde acá —
 * se añadió uno junto a la marca, mismo ícono espejado que "Expandir" del
 * rail, para que el colapso sea reversible.
 */
export function AppSidebar({
  nombre,
  email,
  onCollapse,
  className,
}: AppSidebarProps) {
  return (
    <div
      className={cn(
        "flex h-full w-[260px] flex-col gap-2 overflow-hidden bg-background p-3",
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-2.5 p-2">
        <BrandMark className="size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] leading-5 font-semibold text-foreground">
            Loyalty System
          </p>
          <p className="truncate text-[11px] leading-[14px] text-muted-foreground">
            Motor de promociones
          </p>
        </div>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCollapse}
            title="Colapsar menú"
            className="size-7 rounded-lg"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAVIGATION.map((grupo) => (
          <div key={grupo.titulo} className="w-full">
            <NavGroup titulo={grupo.titulo} />
            {grupo.items.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        ))}
      </nav>

      <UserMenu
        nombre={nombre}
        email={email}
        variant="card"
        className="shrink-0"
      />
    </div>
  )
}
