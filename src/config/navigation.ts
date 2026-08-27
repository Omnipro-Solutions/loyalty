import {
  BarChart3,
  Gauge,
  History,
  LayoutGrid,
  Package,
  PlugZap,
  Settings2,
  ShieldCheck,
  Store,
  Tag,
  Ticket,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react"

export type NavChild = {
  label: string
  href: string
}

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  children?: NavChild[]
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

/**
 * Exact mirror of the Figma sidebar (624:561), with four exceptions: the
 * file doesn't give Journeys/Loyalty Builder its own item in the main nav
 * (the "trending-up" icon there is used by "Audiencias"), "Analítica" (02.1 ·
 * Dashboard · denso) isn't in this mock's sidebar at all — it's a second
 * dashboard variant, reachable only via its own frame's node id —, "Panel de
 * promociones" has no Figma node at all (user request, not in the Figma
 * plan), and "Logs de promociones" is likewise a user request (moved out of
 * `/panel-promociones`'s "Logs" tab into its own Configuración item). Since
 * all four are priority additions, they were added as new entries (Journeys
 * under COMERCIAL, Analítica under Principal next to Resumen which now
 * renders 02.3 · Dashboard · IA, Panel de promociones as the first item
 * under Principal, Logs de promociones under Configuración) — everything
 * else (order, labels, icons) is literal.
 */
export const NAVIGATION: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { label: "Resumen", href: "/resumen", icon: LayoutGrid },
      { label: "Analítica", href: "/analitica", icon: BarChart3 },
      {
        label: "Panel de promociones",
        href: "/panel-promociones",
        icon: Gauge,
      },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Catálogo", href: "/catalogo", icon: Package },
      { label: "Tiendas", href: "/tiendas", icon: Store },
    ],
  },
  {
    title: "Comercial",
    items: [
      { label: "Promociones", href: "/promociones", icon: Tag },
      { label: "Cupones", href: "/cupones", icon: Ticket },
      { label: "Loyalty Builder", href: "/journeys", icon: Workflow },
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Audiencias", href: "/audiencias", icon: TrendingUp },
    ],
  },
  {
    title: "Configuración",
    items: [
      // No Figma equivalent: "09 · Equipo y permisos" y "12 ·
      // Integraciones" son secciones independientes del archivo, antes
      // agrupadas bajo un único ítem colapsable "Ajustes" — a pedido de
      // producto quedan como ítems propios de nivel superior en Configuración.
      {
        label: "Equipo y permisos",
        href: "/ajustes/equipo",
        icon: ShieldCheck,
      },
      {
        label: "Integraciones",
        href: "/ajustes/integraciones",
        icon: PlugZap,
      },
      // Sin equivalente en el Figma — nace del plan de cobertura de
      // docs/promociones.md (Fase 0): parámetros de organización que
      // Promociones y Clientes comparten (valor del punto, breakage,
      // techo de descuento apilado, exclusiones del reglamento).
      {
        label: "Parámetros del programa",
        href: "/ajustes/programa",
        icon: Settings2,
      },
      // Antes vivía como pestaña "Logs" de /panel-promociones — movida aquí
      // a pedido del usuario, como ítem propio de Configuración.
      {
        label: "Logs de promociones",
        href: "/ajustes/logs-promociones",
        icon: History,
      },
    ],
  },
]

/**
 * The collapsed rail (680:230) has a "Pedidos" item in the Figma that
 * doesn't exist anywhere else in the file and is missing "Audiencias" — an
 * inconsistency between mocks. Instead of reproducing it (which would leave
 * unreachable destinations when the sidebar collapses), the rail is the same
 * NAVIGATION flattened without group headers — same visual spec for the rail
 * item, same real set of destinations as the full sidebar.
 */
export const RAIL_ITEMS: NavItem[] = NAVIGATION.flatMap((group) => group.items)

/** A nav item is active on its own route or on any of its sub-routes. */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
