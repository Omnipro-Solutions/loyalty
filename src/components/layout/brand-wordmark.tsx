import { cn } from "@/lib/utils"

type BrandWordmarkProps = {
  className?: string
  /** "default" = --color-foreground (negro sobre claro, blanco sobre oscuro) — para superficies neutras (sidebar, error pages). "inverse" = --color-primary-foreground, para superficies ya coloreadas de marca (el panel de Acceso). El lockup (símbolo + wordmark) es siempre de un solo color de tinta — nunca el acento — ver docs/etter-marca.html cap. "Logotipo y símbolo". */
  variant?: "default" | "inverse"
}

/**
 * etteer wordmark (docs/etter-marca.html, sprite `s-word`): trazado exacto
 * del manual — Instrument Sans 500, ancho 100, minúsculas, tracking
 * −0.045em, ya convertido a contornos, sin depender de tener esa fuente
 * cargada en el sitio (que sigue siendo DM Sans, CLAUDE.md §8). Se entrega
 * con currentColor: el color lo pone el CSS, nunca el archivo — por eso no
 * hay una versión "en violeta", el logotipo nunca lleva el acento.
 */
export function BrandWordmark({
  className,
  variant = "default",
}: BrandWordmarkProps) {
  return (
    <svg
      viewBox="0 0 258.40 67.60"
      role="img"
      aria-label="etteer"
      className={cn(
        "h-auto w-auto",
        variant === "inverse" ? "text-primary-foreground" : "text-foreground",
        className
      )}
    >
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M26 67.6Q18.3 67.6 12.45 64.2Q6.6 60.8 3.3 54.8Q0 48.8 0 41Q0 33.1 3.25 27.15Q6.5 21.2 12.4 17.9Q18.3 14.6 25.9 14.6Q33.3 14.6 38.75 17.75Q44.2 20.9 47.15 26.5Q50.1 32.1 50.1 39.8Q50.1 41 50.05 42.05Q50 43.1 49.8 44.2H7V36.4H42.5L39.9 39.5Q39.9 31.3 36.2 27Q32.5 22.7 25.9 22.7Q18.8 22.7 14.65 27.55Q10.5 32.4 10.5 41Q10.5 49.7 14.65 54.6Q18.8 59.5 26.2 59.5Q30.7 59.5 34 57.65Q37.3 55.8 38.9 52.2H48.7Q46.2 59.4 40.25 63.5Q34.3 67.6 26 67.6ZM77 67.6Q68.1 67.6 63.95 63.45Q59.8 59.3 59.8 51.2V3.9L70.1 0V51.3Q70.1 55.3 72.2 57.2Q74.3 59.1 79 59.1Q80.8 59.1 82.2 58.8Q83.6 58.5 84.6 58.1V66.5Q83.5 67 81.5 67.3Q79.5 67.6 77 67.6ZM49.6 23.9V15.6H84.6V23.9ZM113 67.6Q104.1 67.6 99.95 63.45Q95.8 59.3 95.8 51.2V3.9L106.1 0V51.3Q106.1 55.3 108.2 57.2Q110.3 59.1 115 59.1Q116.8 59.1 118.2 58.8Q119.6 58.5 120.6 58.1V66.5Q119.5 67 117.5 67.3Q115.5 67.6 113 67.6ZM85.6 23.9V15.6H120.6V23.9ZM146.7 67.6Q139 67.6 133.15 64.2Q127.3 60.8 124 54.8Q120.7 48.8 120.7 41Q120.7 33.1 123.95 27.15Q127.2 21.2 133.1 17.9Q139 14.6 146.6 14.6Q154 14.6 159.45 17.75Q164.9 20.9 167.85 26.5Q170.8 32.1 170.8 39.8Q170.8 41 170.75 42.05Q170.7 43.1 170.5 44.2H127.7V36.4H163.2L160.6 39.5Q160.6 31.3 156.9 27Q153.2 22.7 146.6 22.7Q139.5 22.7 135.35 27.55Q131.2 32.4 131.2 41Q131.2 49.7 135.35 54.6Q139.5 59.5 146.9 59.5Q151.4 59.5 154.7 57.65Q158 55.8 159.6 52.2H169.4Q166.9 59.4 160.95 63.5Q155 67.6 146.7 67.6ZM199.2 67.6Q191.5 67.6 185.65 64.2Q179.8 60.8 176.5 54.8Q173.2 48.8 173.2 41Q173.2 33.1 176.45 27.15Q179.7 21.2 185.6 17.9Q191.5 14.6 199.1 14.6Q206.5 14.6 211.95 17.75Q217.4 20.9 220.35 26.5Q223.3 32.1 223.3 39.8Q223.3 41 223.25 42.05Q223.2 43.1 223 44.2H180.2V36.4H215.7L213.1 39.5Q213.1 31.3 209.4 27Q205.7 22.7 199.1 22.7Q192 22.7 187.85 27.55Q183.7 32.4 183.7 41Q183.7 49.7 187.85 54.6Q192 59.5 199.4 59.5Q203.9 59.5 207.2 57.65Q210.5 55.8 212.1 52.2H221.9Q219.4 59.4 213.45 63.5Q207.5 67.6 199.2 67.6ZM229.4 66.6V15.6H239.3V28.3H239.8V66.6ZM239.8 40 238.5 27.9Q240.3 21.4 244.7 18Q249.1 14.6 255.2 14.6Q257.5 14.6 258.4 15V24.8Q257.9 24.6 257 24.55Q256.1 24.5 254.8 24.5Q247.3 24.5 243.55 28.4Q239.8 32.3 239.8 40Z"
      />
    </svg>
  )
}
