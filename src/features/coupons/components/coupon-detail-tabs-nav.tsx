import { UnderlineTabsNav } from "@/components/layout/underline-tabs-nav"

export const COUPON_DETAIL_TABS = [
  { value: "eventos", label: "Log de eventos" },
  { value: "personas", label: "Personas asociadas" },
  { value: "uso", label: "Uso y redención" },
  { value: "reglas", label: "Reglas y restricciones" },
] as const

export type CouponDetailTab = (typeof COUPON_DETAIL_TABS)[number]["value"]

type CouponDetailTabsNavProps = { active: CouponDetailTab; couponId: string }

/** Figma 13.4 "Pestañas" via `UnderlineTabsNav`. */
export function CouponDetailTabsNav({
  active,
  couponId,
}: CouponDetailTabsNavProps) {
  return (
    <UnderlineTabsNav
      active={active}
      tabs={COUPON_DETAIL_TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        href:
          tab.value === "eventos"
            ? `/cupones/${couponId}`
            : `/cupones/${couponId}?tab=${tab.value}`,
      }))}
    />
  )
}
