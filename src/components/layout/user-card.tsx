import { AvatarInitials } from "@/components/layout/avatar-initials"
import { cn } from "@/lib/utils"

type UserCardProps = {
  nombre: string
  email: string
  className?: string
}

/**
 * Figma "User" (624:555): tarjeta rounded-[16px] sobre bg-subtle, avatar
 * 32px con iniciales sobre fondo coral, nombre 13/18 semibold + email 11/14.
 */
export function UserCard({ nombre, email, className }: UserCardProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[16px] bg-muted p-2",
        className
      )}
    >
      <AvatarInitials
        nombre={nombre}
        size={32}
        textClassName="text-xs leading-4"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] leading-[18px] font-semibold text-foreground">
          {nombre}
        </p>
        <p className="truncate text-[11px] leading-[14px] text-muted-foreground">
          {email}
        </p>
      </div>
    </div>
  )
}
