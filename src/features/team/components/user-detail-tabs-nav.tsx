import { UnderlineTabsNav } from "@/components/layout/underline-tabs-nav"

export const USER_DETAIL_TABS = [
  { value: "acceso", label: "Datos y acceso" },
  { value: "seguridad", label: "Seguridad" },
  { value: "dispositivos", label: "Dispositivos" },
] as const

export type UserDetailTab = (typeof USER_DETAIL_TABS)[number]["value"]

type UserDetailTabsNavProps = { active: UserDetailTab; userId: string }

/** Mismo patrón que `CouponDetailTabsNav` (13.4): `UnderlineTabsNav`, primera pestaña sin query param. */
export function UserDetailTabsNav({ active, userId }: UserDetailTabsNavProps) {
  return (
    <UnderlineTabsNav
      active={active}
      tabs={USER_DETAIL_TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        href:
          tab.value === "acceso"
            ? `/ajustes/equipo/usuarios/${userId}`
            : `/ajustes/equipo/usuarios/${userId}?tab=${tab.value}`,
      }))}
    />
  )
}
