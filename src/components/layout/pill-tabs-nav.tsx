import Link from "next/link"

import { cn } from "@/lib/utils"

export type PillTab = { value: string; etiqueta: string; href: string }

type PillTabsNavProps = { tabs: PillTab[]; activo: string }

/**
 * Figma "Tabs" (720:3001 / 718:2883, "09 · Equipo y permisos"): pastilla
 * bg-background + shadow-form-section, activa = bg-primary. Son pestañas
 * de PÁGINA (cada una trae su propia consulta/filtros/paginación), así
 * que son enlaces reales en vez de `Tabs.Root` de Base UI. Compartido
 * entre `features/equipo` y `features/integraciones` — mismo patrón
 * visual en toda "Configuración", no una pestaña por sección.
 */
export function PillTabsNav({ tabs, activo }: PillTabsNavProps) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-background p-1.5 shadow-form-section">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "rounded-full px-4 py-[9px] text-xs leading-[17px] font-medium whitespace-nowrap",
            activo === tab.value
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-secondary-foreground"
          )}
        >
          {tab.etiqueta}
        </Link>
      ))}
    </div>
  )
}
