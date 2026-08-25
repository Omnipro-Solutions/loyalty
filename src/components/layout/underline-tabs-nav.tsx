import Link from "next/link"

import { cn } from "@/lib/utils"

export type UnderlineTab = { value: string; label: string; href: string }

type UnderlineTabsNavProps = { tabs: UnderlineTab[]; active: string }

/**
 * Figma "Pestañas" del detalle del cupón (13.4): texto simple + subrayado
 * en el activo, sobre una línea base compartida — distinto de
 * `PillTabsNav` (píldora sólida). Mismas props que `PillTabsNav` a
 * propósito, por si otro detalle necesita este estilo más adelante.
 */
export function UnderlineTabsNav({ tabs, active }: UnderlineTabsNavProps) {
  return (
    <div className="flex items-center gap-6 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "border-b-2 py-3 text-[13px] whitespace-nowrap",
            active === tab.value
              ? "border-primary font-semibold text-foreground"
              : "border-transparent font-medium text-muted-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
