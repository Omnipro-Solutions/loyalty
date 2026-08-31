import { PillTabsNav } from "@/components/layout/pill-tabs-nav"

export const OBSERVABILITY_TABS = [
  { value: "sistema", label: "Sistema" },
  { value: "integraciones", label: "Integraciones" },
  { value: "incidentes", label: "Incidentes" },
] as const

export type ObservabilityTab = (typeof OBSERVABILITY_TABS)[number]["value"]

type ObservabilityTabsNavProps = { active: ObservabilityTab }

/** Mismo `PillTabsNav` que "12 · Integraciones" — consistencia entre sub-vistas de Ajustes. */
export function ObservabilityTabsNav({ active }: ObservabilityTabsNavProps) {
  return (
    <PillTabsNav
      active={active}
      tabs={OBSERVABILITY_TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        href:
          tab.value === "sistema"
            ? "/ajustes/observabilidad"
            : `/ajustes/observabilidad?tab=${tab.value}`,
      }))}
    />
  )
}
