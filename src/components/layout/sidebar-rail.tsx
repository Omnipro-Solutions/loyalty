"use client"

import { PanelLeftOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { BrandMark } from "@/components/layout/brand-mark"
import { Button } from "@/components/ui/button"
import { isNavActive, NAVIGATION } from "@/config/navigation"
import { cn } from "@/lib/utils"

type SidebarRailProps = {
  nombre: string
  onExpand?: () => void
  className?: string
}

/** Figma "Layout / Sidebar · Rail" (680:230): 72px, bg-white, ítems 40×40 rounded-xl. */
export function SidebarRail({ nombre, onExpand, className }: SidebarRailProps) {
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "flex h-full w-[72px] flex-col items-center gap-3.5 overflow-hidden bg-background py-3.5",
        className
      )}
    >
      <BrandMark className="size-[34px] shrink-0" />

      <nav className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto">
        {NAVIGATION.map((grupo, i) => (
          <div
            key={grupo.titulo}
            className="flex flex-col items-center gap-1.5"
          >
            {i > 0 && <div className="my-1 h-px w-7 bg-border" />}
            {grupo.items.map((item) => {
              const active = isNavActive(pathname, item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.etiqueta}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    active
                      ? "bg-primary text-primary-foreground shadow-nav-active"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-4" />
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onExpand}
          title="Expandir menú"
          className="rounded-lg bg-muted"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
        <AvatarInitials nombre={nombre} size={32} />
      </div>
    </div>
  )
}
