import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"

import { LogoutButton } from "./logout-button"

type PerfilHeroProps = {
  nombre: string
  email: string
  rol: string
}

export function PerfilHero({ nombre, email, rol }: PerfilHeroProps) {
  return (
    <div className="flex items-center gap-[18px] rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <AvatarInitials
        name={nombre}
        size={56}
        textClassName="text-lg leading-6"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-lg font-semibold text-foreground">
          {nombre}
        </p>
        <p className="truncate text-[13px] text-muted-foreground">{email}</p>
      </div>
      <Badge variant="info">{rol}</Badge>
      <LogoutButton />
    </div>
  )
}
