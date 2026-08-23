import Link from "next/link"

import { cn } from "@/lib/utils"

export type PillTab = { value: string; label: string; href: string }

type PillTabsNavProps = { tabs: PillTab[]; active: string }

/**
 * Figma "Tabs" (720:3001 / 718:2883, "09 · Equipo y permisos"): pill
 * bg-background + shadow-form-section, active = bg-primary. These are PAGE
 * tabs (each brings its own query/filters/pagination), so they're real
 * links instead of Base UI's `Tabs.Root`. Shared between `features/team`
 * and `features/integrations` — same visual pattern across all of
 * "Configuración", not one tab per section.
 */
export function PillTabsNav({ tabs, active }: PillTabsNavProps) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-background p-1.5 shadow-form-section">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "rounded-full px-4 py-[9px] text-xs leading-[17px] font-medium whitespace-nowrap",
            active === tab.value
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-secondary-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
