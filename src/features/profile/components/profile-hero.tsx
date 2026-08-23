import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"

import { LogoutButton } from "./logout-button"

type ProfileHeroProps = {
  name: string
  email: string
  role: string
}

export function ProfileHero({ name, email, role }: ProfileHeroProps) {
  return (
    <div className="flex items-center gap-[18px] rounded-[20px] bg-background px-5 py-[18px] shadow-form-section">
      <AvatarInitials name={name} size={56} textClassName="text-lg leading-6" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-lg font-semibold text-foreground">{name}</p>
        <p className="truncate text-[13px] text-muted-foreground">{email}</p>
      </div>
      <Badge variant="info">{role}</Badge>
      <LogoutButton />
    </div>
  )
}
