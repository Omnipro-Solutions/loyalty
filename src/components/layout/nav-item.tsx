"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { isNavActive, type NavItem as NavItemData } from "@/config/navigation"
import { cn } from "@/lib/utils"

/**
 * Figma "Nav / Item" (624:171 Default, 624:175 Hover, 624:179 Active).
 * 244×36, rounded-xl, p-10 gap-10, ícono 16px, texto 13/18 medium.
 */
export function NavItem({ etiqueta, href, icon: Icon }: NavItemData) {
  const pathname = usePathname()
  const active = isNavActive(pathname, href)

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-xl p-2.5 text-[13px] leading-[18px] font-medium",
        active
          ? "bg-primary font-semibold text-primary-foreground shadow-nav-active"
          : "text-muted-foreground hover:bg-muted"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{etiqueta}</span>
    </Link>
  )
}
