import { PillTabsNav } from "@/components/layout/pill-tabs-nav"

export const INTEGRATIONS_TABS = [
  { value: "origenes", label: "Orígenes" },
  { value: "destinos", label: "Destinos" },
  { value: "conexiones", label: "Conexiones activas" },
  { value: "cuentas", label: "Cuentas" },
  { value: "sistema", label: "Vista del sistema" },
] as const

export type IntegrationsTab = (typeof INTEGRATIONS_TABS)[number]["value"]

type IntegrationsTabsNavProps = { active: IntegrationsTab }

/** Same `PillTabsNav` as "09 · Equipo y permisos" — consistency across Ajustes sub-views instead of the Figma's own underline (1262:4214). */
export function IntegrationsTabsNav({ active }: IntegrationsTabsNavProps) {
  return (
    <PillTabsNav
      active={active}
      tabs={INTEGRATIONS_TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        href:
          tab.value === "origenes"
            ? "/ajustes/integraciones"
            : `/ajustes/integraciones?tab=${tab.value}`,
      }))}
    />
  )
}
