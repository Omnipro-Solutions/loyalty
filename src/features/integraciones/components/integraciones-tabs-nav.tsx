import { PillTabsNav } from "@/components/layout/pill-tabs-nav"

export const INTEGRACIONES_TABS = [
  { value: "origenes", label: "Orígenes" },
  { value: "destinos", label: "Destinos" },
  { value: "conexiones", label: "Conexiones activas" },
  { value: "cuentas", label: "Cuentas" },
  { value: "sistema", label: "Vista del sistema" },
] as const

export type IntegracionesTab = (typeof INTEGRACIONES_TABS)[number]["value"]

type IntegracionesTabsNavProps = { active: IntegracionesTab }

/** Same `PillTabsNav` as "09 · Equipo y permisos" — consistency across Ajustes sub-views instead of the Figma's own underline (1262:4214). */
export function IntegracionesTabsNav({ active }: IntegracionesTabsNavProps) {
  return (
    <PillTabsNav
      active={active}
      tabs={INTEGRACIONES_TABS.map((tab) => ({
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
