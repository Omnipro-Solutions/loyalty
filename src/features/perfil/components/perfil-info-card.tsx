import {
  Building2,
  CalendarDays,
  Clock,
  Globe,
  Mail,
  UserCog,
} from "lucide-react"

import { formatDate, formatDateTime } from "@/lib/format"

import type { Perfil } from "../lib/queries"
import { Campo } from "./campo"

type PerfilInfoCardProps = { perfil: Perfil }

export function PerfilInfoCard({ perfil }: PerfilInfoCardProps) {
  return (
    <div className="flex w-full flex-col gap-[18px] rounded-[20px] bg-background px-6 py-[22px] shadow-form-section">
      <p className="text-[15px] font-semibold text-foreground">
        Información de la cuenta
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Campo icon={Mail} etiqueta="CORREO CORPORATIVO" valor={perfil.email} />
        <Campo icon={UserCog} etiqueta="ROL" valor={perfil.rol.nombre} />
        <Campo
          icon={Building2}
          etiqueta="ORGANIZACIÓN"
          valor={perfil.organizacion?.nombre ?? "—"}
        />
        <Campo
          icon={Globe}
          etiqueta="DOMINIO CORPORATIVO"
          valor={perfil.organizacion?.dominio_correo ?? "—"}
        />
        <Campo
          icon={CalendarDays}
          etiqueta="MIEMBRO DESDE"
          valor={formatDate(perfil.creado_en)}
        />
        <Campo
          icon={Clock}
          etiqueta="ÚLTIMO ACCESO"
          valor={
            perfil.ultimoAccesoEn ? formatDateTime(perfil.ultimoAccesoEn) : "—"
          }
        />
      </div>
    </div>
  )
}
