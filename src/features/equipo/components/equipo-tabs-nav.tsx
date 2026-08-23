import { PillTabsNav } from "@/components/layout/pill-tabs-nav"

export const EQUIPO_TABS = [
  { value: "usuarios", etiqueta: "Usuarios" },
  { value: "roles", etiqueta: "Roles y permisos" },
  { value: "invitaciones", etiqueta: "Invitaciones" },
  { value: "auditoria", etiqueta: "Registro de auditoría" },
] as const

export type EquipoTab = (typeof EQUIPO_TABS)[number]["value"]

type EquipoTabsNavProps = { activo: EquipoTab }

/** Figma "Tabs" (720:3001 / 718:2883) vía `PillTabsNav`, compartido con `features/integraciones`. */
export function EquipoTabsNav({ activo }: EquipoTabsNavProps) {
  return (
    <PillTabsNav
      activo={activo}
      tabs={EQUIPO_TABS.map((tab) => ({
        value: tab.value,
        etiqueta: tab.etiqueta,
        href:
          tab.value === "usuarios"
            ? "/ajustes/equipo"
            : `/ajustes/equipo?tab=${tab.value}`,
      }))}
    />
  )
}
