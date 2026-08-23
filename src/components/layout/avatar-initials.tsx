import { formatInitials } from "@/lib/format"
import { cn } from "@/lib/utils"

type AvatarInitialsProps = {
  name: string
  size?: number
  bgClassName?: string
  fgClassName?: string
  textClassName?: string
  className?: string
}

/**
 * Círculo + iniciales reusado por UserCard, SidebarRail y CellEntity
 * (Figma 624:556, 680:228, 697:219 — mismo patrón, distinto color de marca
 * y tamaño de texto). No es el `Avatar` de shadcn: ese trae un anillo
 * (`after:border`) que no está en ninguno de esos nodos del Figma.
 */
export function AvatarInitials({
  name,
  size = 32,
  bgClassName = "bg-avatar-coral-bg",
  fgClassName = "text-avatar-coral-fg",
  textClassName = "text-[11px] leading-[14px]",
  className,
}: AvatarInitialsProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        bgClassName,
        className
      )}
    >
      <span className={cn("font-semibold", textClassName, fgClassName)}>
        {formatInitials(name)}
      </span>
    </div>
  )
}
