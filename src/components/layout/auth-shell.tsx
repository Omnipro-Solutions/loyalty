import { ChartColumn, Gift, ShieldCheck, Zap } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"

import { BrandMark } from "@/components/layout/brand-mark"

const FEATURES = [
  {
    icon: Gift,
    title: "Promociones personalizadas",
    description: "Crea campañas que conectan.",
  },
  {
    icon: ChartColumn,
    title: "Datos que impulsan decisiones",
    description: "Mide, analiza y optimiza resultados.",
  },
  {
    icon: Zap,
    title: "Recompensas que importan",
    description: "Motiva a tus clientes a volver siempre.",
  },
] as const

/**
 * Split-screen shared by the 5 "01 · Acceso" screens (634:774 and
 * analogous): gradient brand panel (brand lockup, headline/copy, feature
 * list and a decorative card illustration, in two columns that wrap to
 * stacked below `lg:w-[40rem]` worth of room) on the left, and a slot on the
 * right for each screen's card.
 *
 * The Figma only covers desktop width. Below `lg` the brand panel is
 * hidden (it doesn't fit next to the card without clipping it) and is
 * replaced by a compact header with the mark.
 *
 * Height fixed to the viewport (`h-dvh` + `overflow-hidden` on the outer
 * shell), no page-level scroll. `dvh` instead of `vh`/`h-screen` because on
 * mobile browsers `vh` includes the area the address bar can hide/show,
 * which would cause a phantom scroll of a few px when scrolling. The card
 * column's vertical padding stays minimal (`py-2`/`py-3`) because the real
 * centering is done by the inner wrapper's `m-auto`, not the padding — any
 * extra padding just takes away available space from the group's tallest
 * card (01.2, with the enrollment QR).
 *
 * The card column itself DOES allow scroll (`overflow-y-auto`) as a last
 * resort: below ~620px of viewport height (a phone in landscape, or an old
 * small phone in portrait) the heaviest card (login, with 2 SSO buttons)
 * doesn't fit even after the mobile header collapses, and clipping it with
 * no way to reach the rest would leave part of the form permanently
 * unreachable. Centering via `m-auto` on the inner wrapper instead of
 * `justify-center` on the scroll container is deliberate: `justify-center`
 * on an overflowing flex container makes the *start* of the content
 * unreachable by scroll (a well-known flexbox gotcha) — `margin: auto`
 * centers the same way when everything fits, but degrades to a normal,
 * fully-scrollable top-aligned flow the moment content overflows.
 *
 * The Figma frame is a fixed 1440x1024 (see `e2e/pixel-perfect.spec.ts`).
 * Below/at that width the row fills the available space exactly as
 * designed — untouched by anything below. Above it (`min-[1441px]:`), the
 * brand panel switches from "rounded card with a margin" to a full-bleed
 * block: it drops the shell's top/left/bottom padding around it and the
 * radius on its outer (left) corners only — the inner corners, against the
 * card column, stay rounded — and grows (`flex-1`, no fixed width) to
 * absorb all the extra width, flush against the viewport's top/left/bottom
 * edges. The
 * card column gets a `max-w` cap at that same breakpoint so it stops
 * growing past its comfortable size — between two `flex-1` siblings, the
 * one with a cap simply stops taking space once it hits it, so the
 * uncapped panel absorbs 100% of anything beyond. This replaces an earlier
 * version that instead capped the whole row at 1440 and centered it
 * (leaving the extra width as plain margin on both sides) — the panel
 * filling the space reads as a deliberate wide layout instead of a small
 * island floating in a sea of background.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-shell-background p-3 min-[1441px]:pt-0 min-[1441px]:pb-0 min-[1441px]:pl-0 sm:p-4 lg:p-[22px]">
      <div
        className="relative hidden shrink-0 overflow-hidden rounded-[22px] p-10 text-primary-foreground shadow-auth-card min-[1441px]:w-auto min-[1441px]:flex-1 lg:flex lg:w-[40rem]"
        style={{ backgroundImage: "var(--gradient-auth-panel)" }}
      >
        <div className="flex w-full flex-1 flex-wrap items-center gap-10">
          <div className="flex min-w-64 flex-1 flex-col justify-between gap-6 self-stretch">
            <div className="flex items-center gap-3">
              <BrandMark variant="inverse" className="size-10 shrink-0" />
              <div className="flex flex-col leading-[26px]">
                <p className="text-5xl font-semibold">etteer</p>
                <p className="text-md font-extrabold">Loyalty System</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-[40px] leading-[1.15] font-semibold tracking-tight text-balance">
                Un programa,
                <br />
                muchas formas
                <br />
                de <span className="text-primary-300">pertenecer</span>
              </p>
              <p className="max-w-sm text-[15px] leading-6 text-primary-100">
                Impulsa la lealtad, recompensa cada acción y crea experiencias
                que tus clientes recordarán.
              </p>
              <div className="mt-2 flex flex-col gap-4">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
                      <feature.icon className="size-4" />
                    </span>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold">{feature.title}</p>
                      <p className="text-xs text-primary-100">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 backdrop-blur-md">
              <ShieldCheck className="size-3.5" />
              <span className="text-xs font-medium">
                Seguro, confiable y siempre disponible
              </span>
            </div>
          </div>

          <div className="relative -mx-10 min-w-56 flex-1 self-stretch">
            <div
              aria-hidden
              className="absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-[3rem] border-8 border-primary-foreground/10"
            />
            <div
              aria-hidden
              className="absolute top-1/2 left-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground/10 blur-3xl"
            />
            <Image
              src="/tarjeta.png"
              alt=""
              fill
              sizes="(min-width: 1460px) 34vw, 380px"
              className="scale-[1.4] object-contain drop-shadow-2xl"
            />
            <div className="absolute top-[8%] right-[6%] z-10 flex animate-float items-center gap-2.5 rounded-full border border-black/5 bg-background/90 py-2 pr-4 pl-2 shadow-auth-card backdrop-blur-md">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand/10">
                <Zap className="size-3.5 text-brand" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                2x Puntos
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 scrollbar-thin flex-col overflow-y-auto px-3 py-2 min-[1441px]:max-w-[880px] sm:px-6">
        <div className="m-auto flex w-full flex-col items-center gap-2">
          {/*
            Icon only (no text) on mobile: with the most content-heavy
            screens (login with 2 SSO buttons, SSO denied with the detail
            table) even the previous compact header (icon + "Loyalty
            System / By Etter") made the total not fit without clipping on
            a ~667px viewport (iPhone SE). The icon-only version keeps
            BrandMark's `aria-label`, so it's still accessible without the
            visible text. Below 680px of height (some compact Androids,
            ~640px) even the icon is hidden — with login (the heaviest, 2
            SSO buttons) there were still only ~18px to spare there.
          */}
          <BrandMark className="size-6 shrink-0 lg:hidden [@media(max-height:680px)]:hidden" />
          {children}
        </div>
      </div>
    </div>
  )
}
