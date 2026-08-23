import { cn } from "@/lib/utils"

type BrandMarkProps = {
  className?: string
  /** "default" = brand background, white icon. "inverse" = white background, brand icon. */
  variant?: "default" | "inverse"
}

/**
 * Loyalty System mark (Figma "Brand / Mark" 686:204 / "· inverso" 686:209).
 * Exact path exported from Figma; colors are resolved to tokens instead of
 * the original hex values so it respects the theme.
 */
export function BrandMark({ className, variant = "default" }: BrandMarkProps) {
  const bg =
    variant === "default" ? "var(--color-brand)" : "var(--color-background)"
  const check =
    variant === "default"
      ? "var(--color-primary-foreground)"
      : "var(--color-brand)"

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn("size-16", className)}
      role="img"
      aria-label="Loyalty System"
    >
      <rect width="64" height="64" rx="16" fill={bg} />
      <path
        d="M20.5 41L29 30.5L36 36.5L44.5 23"
        stroke={check}
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={variant === "default" ? "M40.5 19.5H48V27" : "M38.5 22.5H46V30"}
        stroke="var(--color-data-coral)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
