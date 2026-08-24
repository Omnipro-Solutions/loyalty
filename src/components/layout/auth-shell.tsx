import type { ReactNode } from "react"

import { BrandMark } from "@/components/layout/brand-mark"

const STATS = [
  { value: "42", label: "tiendas conectadas" },
  { value: "8.412", label: "clientes activos" },
  { value: "99,9%", label: "disponibilidad" },
] as const

/**
 * Split-screen shared by the 5 "01 · Acceso" screens (634:774 and
 * analogous): gradient brand panel + 3 stats on the left, and a slot on the
 * right for each screen's card. The panel copy is identical across 4 of the
 * Figma's 5 screens; 01.2 has a variant with "POS y el e-commerce" that's
 * treated as a file inconsistency and normalized to the common text.
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
        className="hidden shrink-0 flex-col justify-center gap-4 overflow-hidden rounded-[22px] p-10 text-primary-foreground min-[1441px]:w-auto min-[1441px]:flex-1 lg:flex lg:w-140"
        style={{ backgroundImage: "var(--gradient-auth-panel)" }}
      >
        <div className="flex items-center gap-3">
          <BrandMark variant="inverse" className="size-10 shrink-0" />
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
            <div key={stat.label} className="flex flex-col gap-0.5">
              <p className="text-4xl leading-7 font-semibold">{stat.value}</p>
              <p className="text-xs leading-4 text-primary-100">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-3 py-2 min-[1441px]:max-w-[880px] sm:px-6">
        <div className="m-auto flex w-full flex-col items-center gap-2">
          {/*
            Icon only (no text) on mobile: with the most content-heavy
            screens (login with 2 SSO buttons, SSO denied with the detail
            table) even the previous compact header (icon + "Loyalty
            System / By Omni") made the total not fit without clipping on
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
