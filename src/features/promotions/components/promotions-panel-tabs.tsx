import { PillTabsNav } from "@/components/layout/pill-tabs-nav"

export const PROMOTIONS_PANEL_TABS = [
  { value: "resumen", label: "Resumen" },
  { value: "rendimiento", label: "Rendimiento" },
] as const

export type PromotionsPanelTab = (typeof PROMOTIONS_PANEL_TABS)[number]["value"]

export function isPanelTab(
  value: string | undefined
): value is PromotionsPanelTab {
  return PROMOTIONS_PANEL_TABS.some((t) => t.value === value)
}

/**
 * Dos vistas. El panel había crecido hasta necesitar varias pantallas de
 * scroll para llegar a lo de abajo, que es la forma más segura de que nadie
 * lo vea nunca; el corte no es por tipo de gráfica sino por la pregunta que
 * contesta.
 *
 * · **Resumen** — qué resultado produjo lo configurado y a costa de qué:
 *   evolución, portafolio, mecánica, cupones, regla, presupuesto y
 *   financiamiento. El dinero vive aquí y no en una pestaña aparte porque
 *   "cuánto rindió" y "cuánto costó" son la misma pregunta partida en dos:
 *   leer el ROI en una pantalla y el presupuesto que lo produjo en otra
 *   obligaba a recordar cifras entre clics.
 * · **Rendimiento** — para quién está funcionando: el corte por atributo de
 *   la regla, el canal y los desgloses por producto, punto y ticket.
 *
 * Filtros y KPI de resultado quedan fuera de las pestañas porque son el
 * marco de las dos.
 *
 * Hubo una tercera, "Operación" (alertas, próximas a vencer, línea de tiempo
 * y colisiones). Salió a pedido del usuario: era lo único de la pantalla que
 * no contestaba "¿qué resultado produjo esto?" sino "¿qué hay que atender?",
 * y esa pregunta ya vive en `/promociones` y en `/ajustes/logs-sistema`.
 *
 * A diferencia de las pestañas de Equipo, aquí los enlaces arrastran los
 * searchParams actuales: cambiar de vista no puede tirar el rango, los
 * filtros ni el eje que el usuario acaba de elegir.
 */
export function PromotionsPanelTabs({
  active,
  params,
}: {
  active: PromotionsPanelTab
  params: Record<string, string | string[] | undefined>
}) {
  const base = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === "vista") continue
    const first = Array.isArray(value) ? value[0] : value
    if (first) base.set(key, first)
  }

  return (
    <PillTabsNav
      active={active}
      tabs={PROMOTIONS_PANEL_TABS.map((tab) => {
        const search = new URLSearchParams(base)
        if (tab.value !== "resumen") search.set("vista", tab.value)
        const query = search.toString()
        return {
          value: tab.value,
          label: tab.label,
          href: `/panel-promociones${query ? `?${query}` : ""}`,
        }
      })}
    />
  )
}
