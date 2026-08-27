import { cn } from "@/lib/utils"

type BrandMarkProps = {
  className?: string
  /** "default" = brand-colored tile, white mark (the app-icon lockup). "inverse" = bare white mark, for surfaces already brand- or dark-colored. */
  variant?: "default" | "inverse"
}

const MARK_PATHS = (
  <>
    <path d="M 492 42 L 767 42 L 767 317"></path>
    <path d="M 352 457 L 352 147 M 352 457 L 132 237 M 352 457 L 42 457 M 352 457 L 132 677 M 352 457 L 352 767 M 352 457 L 572 677 M 352 457 L 662 457"></path>
  </>
)

/**
 * etteer mark (Figma "Brand / Mark" 686:204). Exact path exported from
 * Figma.
 */
export function BrandMark({ className, variant = "default" }: BrandMarkProps) {
  if (variant === "inverse") {
    return (
      <svg
        viewBox="0 0 809 809"
        role="img"
        aria-label="Loyalty System"
        className={cn("size-16 text-primary-foreground", className)}
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="84"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {MARK_PATHS}
        </g>
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 1150 1150"
      role="img"
      aria-label="Loyalty System"
      className={cn("size-16", className)}
    >
      <rect width="1150" height="1150" rx="255" fill="var(--color-primary)" />
      <g
        transform="translate(170.5 170.5)"
        fill="none"
        stroke="var(--color-primary-foreground)"
        strokeWidth="84"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {MARK_PATHS}
      </g>
    </svg>
  )
}
