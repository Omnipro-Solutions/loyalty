import {
  Baby,
  Calendar,
  Clock,
  Hash,
  Heart,
  IdCard,
  Languages,
  type LucideIcon,
  Mail,
  Map,
  Megaphone,
  PawPrint,
  Pencil,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatLongDate, formatMonthYear, formatPercent } from "@/lib/format"

import { CopyButton } from "./copy-button"
import { avatarPalette } from "../lib/avatar-palette"
import {
  ACQUISITION_CHANNEL_LABEL,
  DOCUMENT_TYPE_SHORT_LABEL,
  MARITAL_STATUS_LABEL,
  LANGUAGE_LABEL,
  MEMBER_STATUS_LABEL,
  TIER_LABEL,
} from "../lib/labels"
import {
  calculateCompleteness,
  isAtRiskOfTierDowngrade,
  isVip,
  formatTenure,
  getQualificationPeriod,
  type Member,
} from "../lib/queries"

function dash(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "—"
}

function yesNo(value: boolean | null): string {
  return value === null ? "—" : value ? "Sí" : "No"
}

function HeroField({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <p className="truncate text-[10px] text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-center gap-1 pl-5">
        <p className="truncate text-xs font-semibold text-foreground">
          {value}
        </p>
        {action}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="w-full text-[9px] font-semibold tracking-[0.72px] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

type MemberHeroProps = { member: Member }

/**
 * Figma "Hero" (1142:4595) pixel-perfect: identidad + acciones, luego
 * IDENTIDAD / RELACIÓN CON LA MARCA / PERFIL COMERCIAL. Las dos últimas
 * secciones reemplazan el contenido de ejemplo del Figma (Segmento RFM,
 * frecuencia de compra, etc. — necesitan pedidos) por los atributos reales
 * del socio que sí existen en `members`.
 */
export function MemberHero({ member }: MemberHeroProps) {
  const fullName = `${member.nombre} ${member.apellido}`.trim()
  const palette = avatarPalette(member.id)
  const completeness = calculateCompleteness(member)
  const vip = isVip(member.tier?.nombre)
  const atRisk = isAtRiskOfTierDowngrade(member)
  const { daysRemaining } = getQualificationPeriod()
  const document = member.numero_documento
    ? `${member.tipo_documento ? `${DOCUMENT_TYPE_SHORT_LABEL[member.tipo_documento as keyof typeof DOCUMENT_TYPE_SHORT_LABEL]} ` : ""}${member.numero_documento}`
    : "—"

  return (
    <div className="flex size-full flex-col justify-between gap-3.5 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex w-full flex-col items-center gap-3.5">
        <div className="flex w-full items-center gap-3.5">
          <AvatarInitials
            name={fullName}
            size={56}
            bgClassName={palette.bg}
            fgClassName={palette.fg}
            textClassName="text-xl leading-[26px]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-xl font-bold tracking-[-0.4px] text-foreground">
                {fullName}
              </p>
              {vip && <Badge variant="info">VIP</Badge>}
              {member.tier && (
                <Badge variant="info">
                  {TIER_LABEL[member.tier.nombre as keyof typeof TIER_LABEL] ??
                    member.tier.nombre}
                </Badge>
              )}
              {atRisk && (
                <Badge variant="warning">Riesgo de baja de nivel</Badge>
              )}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              Calificación cierra 31 dic · {daysRemaining} días
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<Link href={`/clientes/${member.id}/editar`} />}
          >
            <Pencil className="size-3.5" />
            Editar cliente
          </Button>
        </div>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="flex w-full flex-col gap-2.5">
        <SectionTitle>Identidad</SectionTitle>
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
          <HeroField icon={User} label="Nombre" value={fullName} />
          <HeroField icon={IdCard} label="Documento" value={document} />
          <HeroField
            icon={Calendar}
            label="Nacimiento"
            value={
              member.fecha_nacimiento
                ? formatLongDate(member.fecha_nacimiento)
                : "—"
            }
          />
          <HeroField
            icon={Mail}
            label="Correo"
            value={member.email}
            action={<CopyButton value={member.email} />}
          />
          <HeroField
            icon={Phone}
            label="Teléfono"
            value={dash(member.telefono)}
            action={
              member.telefono ? <CopyButton value={member.telefono} /> : null
            }
          />
          <HeroField
            icon={Map}
            label="Provincia"
            value={dash(member.provincia)}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <SectionTitle>Relación con la marca</SectionTitle>
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
          <HeroField
            icon={Hash}
            label="ID de socio"
            value={<span className="font-mono">{member.codigo_socio}</span>}
          />
          <HeroField
            icon={Store}
            label="Tienda"
            value={
              member.enrollmentStore
                ? `${member.enrollmentStore.nombre} · ${formatMonthYear(member.fecha_alta)}`
                : "—"
            }
          />
          <HeroField
            icon={Clock}
            label="Antigüedad"
            value={formatTenure(member.fecha_alta)}
          />
          <HeroField
            icon={Megaphone}
            label="Canal de adquisición"
            value={
              member.canal_adquisicion
                ? ACQUISITION_CHANNEL_LABEL[
                    member.canal_adquisicion as keyof typeof ACQUISITION_CHANNEL_LABEL
                  ]
                : "—"
            }
          />
          <HeroField
            icon={Languages}
            label="Language"
            value={LANGUAGE_LABEL[member.idioma as keyof typeof LANGUAGE_LABEL]}
          />
          <HeroField
            icon={ShieldCheck}
            label="Perfil unificado"
            value={`${completeness.filled} de ${completeness.total} atributos · ${formatPercent(completeness.percentage)}`}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <SectionTitle>Perfil comercial</SectionTitle>
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
          <HeroField
            icon={Heart}
            label="Estado civil"
            value={
              member.estado_civil
                ? MARITAL_STATUS_LABEL[
                    member.estado_civil as keyof typeof MARITAL_STATUS_LABEL
                  ]
                : "—"
            }
          />
          <HeroField
            icon={ShoppingBag}
            label="Preferencia de compra"
            value={dash(member.preferencia_compra)}
          />
          <HeroField
            icon={Baby}
            label="Hijos"
            value={yesNo(member.tiene_hijos)}
          />
          <HeroField
            icon={PawPrint}
            label="Mascotas"
            value={yesNo(member.tiene_mascotas)}
          />
          <HeroField
            icon={Mail}
            label="Consentimiento de marketing"
            value={member.consentimiento_marketing ? "Otorgado" : "No otorgado"}
          />
          <HeroField
            icon={ShieldCheck}
            label="Estado de cuenta"
            value={
              MEMBER_STATUS_LABEL[
                member.estado_cuenta as keyof typeof MEMBER_STATUS_LABEL
              ]
            }
          />
        </div>
      </div>
    </div>
  )
}
