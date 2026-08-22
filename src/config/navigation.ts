import {
  LayoutGrid,
  Package,
  Settings,
  SlidersHorizontal,
  Store,
  Tag,
  TrendingUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  etiqueta: string
  href: string
  icon: LucideIcon
}

export type NavGroup = {
  titulo: string
  items: NavItem[]
}

/**
 * Espejo exacto del sidebar en Figma (624:561), con una excepción: el
 * archivo no le da un ítem propio a Journeys/Loyalty Builder en el nav
 * principal (el ícono "trending-up" ahí lo usa "Audiencias"). Como Journeys
 * es uno de los dos módulos prioritarios del MVP, se añadió como entrada
 * nueva en COMERCIAL — todo lo demás (orden, etiquetas, íconos) es literal.
 */
export const NAVIGATION: NavGroup[] = [
  {
    titulo: "Principal",
    items: [{ etiqueta: "Resumen", href: "/resumen", icon: LayoutGrid }],
  },
  {
    titulo: "Catálogo",
    items: [
      { etiqueta: "Catálogo", href: "/catalogo", icon: Package },
      { etiqueta: "Tiendas", href: "/tiendas", icon: Store },
    ],
  },
  {
    titulo: "Comercial",
    items: [
      { etiqueta: "Promociones", href: "/promociones", icon: Tag },
      { etiqueta: "Journeys", href: "/journeys", icon: Workflow },
      {
        etiqueta: "Reglas de descuento",
        href: "/reglas",
        icon: SlidersHorizontal,
      },
      { etiqueta: "Clientes", href: "/clientes", icon: Users },
      { etiqueta: "Audiencias", href: "/audiencias", icon: TrendingUp },
    ],
  },
  {
    titulo: "Configuración",
    items: [{ etiqueta: "Ajustes", href: "/ajustes", icon: Settings }],
  },
]

/**
 * El rail colapsado (680:230) trae en el Figma un ítem "Pedidos" que no
 * existe en ningún otro lado del archivo y le falta "Audiencias" — una
 * inconsistencia entre mocks. En vez de reproducirla (dejaría destinos
 * inalcanzables al colapsar el sidebar), el rail es el mismo NAVIGATION
 * aplanado sin encabezados de grupo — misma spec visual del ítem de rail,
 * mismo conjunto real de destinos que el sidebar completo.
 */
export const RAIL_ITEMS: NavItem[] = NAVIGATION.flatMap((grupo) => grupo.items)

/** Un ítem de nav está activo en su propia ruta o en cualquier sub-ruta suya. */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
