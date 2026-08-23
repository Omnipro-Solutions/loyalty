import { PillTabsNav } from "@/components/layout/pill-tabs-nav"

export const EQUIPO_TABS = [
  { value: "usuarios", label: "Usuarios" },
  { value: "roles", label: "Roles y permisos" },
  { value: "invitaciones", label: "Invitaciones" },
  { value: "auditoria", label: "Registro de auditoría" },
] as const

export type EquipoTab = (typeof EQUIPO_TABS)[number]["value"]

type EquipoTabsNavProps = { active: EquipoTab }

/** Figma "Tabs" (720:3001 / 718:2883) via `PillTabsNav`, shared with `features/integraciones`. */
export function EquipoTabsNav({ active }: EquipoTabsNavProps) {
  return (
    <PillTabsNav
      active={active}
      tabs={EQUIPO_TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        href:
          tab.value === "usuarios"
            ? "/ajustes/equipo"
            : `/ajustes/equipo?tab=${tab.value}`,
      }))}
    />
  )
}
