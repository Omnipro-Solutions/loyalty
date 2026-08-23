import { PillTabsNav } from "@/components/layout/pill-tabs-nav"

export const INTEGRACIONES_TABS = [
  { value: "origenes", etiqueta: "Orígenes" },
  { value: "destinos", etiqueta: "Destinos" },
  { value: "conexiones", etiqueta: "Conexiones activas" },
  { value: "cuentas", etiqueta: "Cuentas" },
  { value: "sistema", etiqueta: "Vista del sistema" },
] as const

export type IntegracionesTab = (typeof INTEGRACIONES_TABS)[number]["value"]

type IntegracionesTabsNavProps = { activo: IntegracionesTab }

/** Mismo `PillTabsNav` que "09 · Equipo y permisos" — consistencia entre las sub-vistas de Ajustes en vez del subrayado propio del Figma (1262:4214). */
export function IntegracionesTabsNav({ activo }: IntegracionesTabsNavProps) {
  return (
    <PillTabsNav
      activo={activo}
      tabs={INTEGRACIONES_TABS.map((tab) => ({
        value: tab.value,
        etiqueta: tab.etiqueta,
        href:
          tab.value === "origenes"
            ? "/ajustes/integraciones"
            : `/ajustes/integraciones?tab=${tab.value}`,
      }))}
    />
  )
}
