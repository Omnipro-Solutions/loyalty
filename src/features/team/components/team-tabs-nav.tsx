import { PillTabsNav } from "@/components/layout/pill-tabs-nav"

export const TEAM_TABS = [
  { value: "usuarios", label: "Usuarios" },
  { value: "roles", label: "Roles y permisos" },
  { value: "invitaciones", label: "Invitaciones" },
  { value: "auditoria", label: "Registro de auditoría" },
] as const

export type TeamTab = (typeof TEAM_TABS)[number]["value"]

type TeamTabsNavProps = { active: TeamTab }

/** Figma "Tabs" (720:3001 / 718:2883) via `PillTabsNav`, shared with `features/integrations`. */
export function TeamTabsNav({ active }: TeamTabsNavProps) {
  return (
    <PillTabsNav
      active={active}
      tabs={TEAM_TABS.map((tab) => ({
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
