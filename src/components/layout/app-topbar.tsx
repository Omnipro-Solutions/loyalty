"use client"

import { HelpCircle, Menu, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useMobileNav } from "@/components/layout/mobile-nav-context"
import { NotificationsMenu } from "@/components/layout/notifications-menu"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"

type AppTopbarProps = {
  breadcrumb?: string
  title: string
  className?: string
}

/**
 * Figma "Layout / Topbar" (624:614): 68px, px-7 pt-[18px] pb-4, gap-4.
 *
 * El Figma solo dibuja el ancho de escritorio; los controles de la derecha
 * se van retirando por orden inverso de importancia a medida que baja el
 * ancho disponible (la ayuda y el pill de búsqueda debajo de `sm`, el pill
 * además se estrecha en los tramos intermedios) y debajo de `lg` aparece el
 * botón de menú que abre el sidebar off-canvas (ver `AppShell`).
 */
export function AppTopbar({ breadcrumb, title, className }: AppTopbarProps) {
  const mobileNav = useMobileNav()

  return (
    <div
      className={cn(
        "flex h-[68px] w-full items-center gap-2 px-4 pt-[18px] pb-4 sm:gap-4 sm:px-7",
        className
      )}
    >
      {mobileNav && (
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => mobileNav.setOpen(true)}
          title="Abrir menú"
          aria-label="Abrir menú"
          className="shrink-0 rounded-full bg-background shadow-topbar-control lg:hidden"
        >
          <Menu className="size-4" />
        </Button>
      )}

      <div className="min-w-0 flex-1">
        {breadcrumb && (
          <p className="truncate text-[11px] leading-[14px] text-muted-foreground">
            {breadcrumb}
          </p>
        )}
        <p className="truncate text-[18px] leading-6 font-semibold text-foreground">
          {title}
        </p>
      </div>

      <div className="hidden h-9 w-[140px] shrink-0 items-center gap-2 rounded-full bg-background px-4 py-2.5 shadow-topbar-control sm:flex md:w-[180px] xl:w-[260px]">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar…"
          className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ThemeToggle />
      <NotificationsMenu />
      <Button
        variant="ghost"
        size="icon-lg"
        title="Ayuda"
        aria-label="Ayuda"
        className="hidden rounded-full bg-background shadow-topbar-control sm:inline-flex"
      >
        <HelpCircle className="size-4" />
      </Button>
    </div>
  )
}
