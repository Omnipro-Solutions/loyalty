"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { value: "resumen", label: "Resumen" },
  { value: "logs", label: "Logs" },
] as const

type PromotionsDashboardTabsProps = { active: "resumen" | "logs" }

/** Adaptado de las pestañas "Dashboard de efectividad" / "Logs de compras e interacciones" (Analítica de Loyalty.dc.html) — subrayado activo, sin fondo de color. */
export function PromotionsDashboardTabs({
  active,
}: PromotionsDashboardTabsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <div className="flex w-full items-center gap-6">
      {TABS.map((tab) => {
        const params = new URLSearchParams(searchParams.toString())
        if (tab.value === "resumen") params.delete("vista")
        else params.set("vista", tab.value)
        const query = params.toString()
        const href = query ? `${pathname}?${query}` : pathname
        const isActive = active === tab.value

        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "border-b-2 pb-3 text-sm font-medium",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-secondary-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
