import {
  Building2,
  CalendarDays,
  Clock,
  Globe,
  Mail,
  UserCog,
} from "lucide-react"

import { formatDate, formatDateTime } from "@/lib/format"

import type { Profile } from "../lib/queries"
import { Field } from "./field"

type ProfileInfoCardProps = { profile: Profile }

export function ProfileInfoCard({ profile }: ProfileInfoCardProps) {
  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <p className="text-[15px] font-semibold text-foreground">
        Información de la cuenta
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field icon={Mail} label="CORREO CORPORATIVO" value={profile.email} />
        <Field icon={UserCog} label="ROL" value={profile.role.nombre} />
        <Field
          icon={Building2}
          label="ORGANIZACIÓN"
          value={profile.organization?.nombre ?? "—"}
        />
        <Field
          icon={Globe}
          label="DOMINIO CORPORATIVO"
          value={profile.organization?.dominio_correo ?? "—"}
        />
        <Field
          icon={CalendarDays}
          label="MIEMBRO DESDE"
          value={formatDate(profile.creado_en)}
        />
        <Field
          icon={Clock}
          label="ÚLTIMO ACCESO"
          value={
            profile.lastSignInAt ? formatDateTime(profile.lastSignInAt) : "—"
          }
        />
      </div>
    </div>
  )
}
