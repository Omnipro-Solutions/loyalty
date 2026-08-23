import type { ReactNode } from "react"

import { BrandMark } from "@/components/layout/brand-mark"

const STATS = [
  { valor: "42", etiqueta: "tiendas conectadas" },
  { valor: "8.412", etiqueta: "clientes activos" },
  { valor: "99,9%", etiqueta: "disponibilidad" },
] as const

/**
 * Split-screen compartido por las 5 pantallas de "01 · Acceso" (634:774 y
 * análogos): panel de marca con gradiente + 3 stats a la izquierda, y un
 * slot a la derecha para la tarjeta de cada pantalla. El copy del panel es
 * idéntico en 4 de las 5 pantallas del Figma; 01.2 trae una variante con
 * "POS y el e-commerce" que se trata como inconsistencia del archivo y se
 * normaliza al texto común.
 *
 * El Figma solo cubre el ancho de escritorio. Por debajo de `lg` el panel
 * de marca se oculta (no cabe junto a la tarjeta sin recortarla) y se
 * reemplaza por un encabezado compacto con la marca.
 *
 * Altura fija a la ventana (`h-dvh` + `overflow-hidden`), sin scroll de
 * página ni interno bajo ninguna circunstancia — pedido explícito del
 * usuario. `dvh` en vez de `vh`/`h-screen` porque en navegadores móviles
 * `vh` incluye el área que la barra de direcciones puede ocultar/mostrar,
 * lo que causaría un scroll fantasma de unos pocos px al hacer scroll.
 * El padding vertical de la columna de la tarjeta se mantiene mínimo
 * (`py-2`/`py-3`) porque el centrado real lo hace `justify-center`, no el
 * padding — cualquier padding de más solo le resta espacio disponible a
 * la tarjeta más alta del grupo (01.2, con el QR de enrolamiento).
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-neutral-50 p-3 sm:p-4 lg:p-[22px]">
      <div
        className="hidden shrink-0 flex-col justify-center gap-4 overflow-hidden rounded-[22px] p-10 text-primary-foreground lg:flex lg:w-[560px]"
        style={{ backgroundImage: "var(--gradient-auth-panel)" }}
      >
        <div className="flex items-center gap-3">
          <BrandMark variant="inverso" className="size-10 shrink-0" />
          <div className="flex flex-col leading-[26px]">
            <p className="text-4xl font-semibold">Loyalty System</p>
            <p className="text-sm font-extrabold">By Omni</p>
          </div>
        </div>
        <p className="text-[34px] leading-[44px] font-semibold text-balance">
          El motor de promociones que tus tiendas entienden.
        </p>
        <p className="text-[15px] leading-6 text-primary-100">
          Reglas, catálogo y campañas sincronizadas en tiempo real con el
          e-commerce.
        </p>
        <div className="flex gap-8 pt-4">
          {STATS.map((stat) => (
            <div key={stat.etiqueta} className="flex flex-col gap-0.5">
              <p className="text-4xl leading-7 font-semibold">{stat.valor}</p>
              <p className="text-xs leading-4 text-primary-100">
                {stat.etiqueta}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-3 py-2 sm:px-6">
        {/*
          Solo el ícono (sin texto) en mobile: con las pantallas más
          cargadas de contenido (login con 2 botones SSO, SSO denegado con
          la tabla de detalle) hasta el encabezado compacto anterior
          (ícono + "Loyalty System / By Omni") hacía que el total no
          entrara sin recortarse en un viewport de ~667px (iPhone SE). El
          ícono solo mantiene el `aria-label` de BrandMark, así que sigue
          siendo accesible sin el texto visible. Por debajo de 680px de
          alto (algunos Android compactos, ~640px) hasta el ícono se oculta
          — con el login (el más cargado, 2 botones SSO) igual sobraban
          ~18px ahí.
        */}
        <BrandMark className="size-6 shrink-0 lg:hidden [@media(max-height:680px)]:hidden" />
        {children}
      </div>
    </div>
  )
}
