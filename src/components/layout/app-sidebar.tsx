"use client"

import { PanelLeftClose } from "lucide-react"

import { BrandMark } from "@/components/layout/brand-mark"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { NavGroup } from "@/components/layout/nav-group"
import { NavItem } from "@/components/layout/nav-item"
import { UserMenu } from "@/components/layout/user-menu"
import { Button } from "@/components/ui/button"
import { NAVIGATION } from "@/config/navigation"
import { cn } from "@/lib/utils"

type AppSidebarProps = {
  name: string
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
  name,
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
        <div className="min-w-0 flex-1">
          {/* Lockup horizontal del manual (docs/etter-marca.html, cap.
              "Logotipo y símbolo"): el símbolo mide 50.73 de 67.6 unidades
              del wordmark (≈75% de su altura), alineado al nombre — no al
              bloque de dos líneas completo, por eso el wordmark tiene su
              propia fila con el símbolo y "Loyalty System" va debajo,
              suelto. El wordmark es el trazado exacto del manual
              (`BrandWordmark`, sprite `s-word`), no texto en vivo — ya
              viene con la tipografía, el tracking y las curvas correctas.
              El lockup (símbolo + wordmark juntos) es SIEMPRE de un solo
              color de tinta (negro sobre claro, blanco sobre oscuro) — el
              símbolo solo puede llevar un color de marca cuando va solo,
              nunca junto al wordmark (el generador de renditions del
              manual pinta ambos con el mismo `fg`). Por eso el símbolo usa
              `text-foreground`, igual que el wordmark, no `text-primary`. */}
          <div className="flex items-center gap-2">
            <BrandMark className="size-6 shrink-0 text-foreground" />
            <BrandWordmark className="h-5 w-auto shrink-0" />
          </div>
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

      <nav className="flex min-h-0 flex-1 scrollbar-thin flex-col gap-0.5 overflow-y-auto">
        {NAVIGATION.map((group) => (
          <div key={group.title} className="w-full">
            <NavGroup title={group.title} />
            {group.items.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        ))}
      </nav>

      <UserMenu name={name} email={email} variant="card" className="shrink-0" />
    </div>
  )
}
