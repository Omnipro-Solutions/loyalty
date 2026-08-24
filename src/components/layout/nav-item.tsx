"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { isNavActive, type NavItem as NavItemData } from "@/config/navigation"
import { cn } from "@/lib/utils"

/**
 * Figma "Nav / Item" (624:171 Default, 624:175 Hover, 624:179 Active).
 * 244×36, rounded-xl, p-10 gap-10, 16px icon, 13/18 medium text.
 *
 * `children` has no Figma equivalent: it's a generic mechanism for grouping
 * sub-routes under a collapsible item — unused by any item in
 * `config/navigation.ts` today.
 */
export function NavItem({ label, href, icon: Icon, children }: NavItemData) {
  const pathname = usePathname()
  const sectionActive =
    children?.some((child) => isNavActive(pathname, child.href)) ?? false
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const open = manualOpen ?? sectionActive

  if (!children) {
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
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </Link>
    )
  }

  return (
    <div className="flex w-full flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex h-9 w-full items-center gap-2.5 rounded-xl p-2.5 text-[13px] leading-[18px] font-medium",
          sectionActive && !open
            ? "bg-primary font-semibold text-primary-foreground shadow-nav-active"
            : sectionActive
              ? "font-semibold text-foreground"
              : "text-muted-foreground hover:bg-muted"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 py-0.5 pl-[34px]">
          {children.map((child) => {
            const childActive = isNavActive(pathname, child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={childActive ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center rounded-lg px-2.5 text-[12.5px] leading-4",
                  childActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
