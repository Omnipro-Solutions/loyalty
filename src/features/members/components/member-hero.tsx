import {
  Award,
  Baby,
  Calendar,
  CalendarClock,
  Clock,
  Hash,
  Heart,
  History,
  IdCard,
  Languages,
  Mail,
  Map,
  Megaphone,
  PawPrint,
  Phone,
  Receipt,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Tag,
  type LucideIcon,
  User,
} from "lucide-react"
import type { ReactNode } from "react"

import { AvatarInitials } from "@/components/layout/avatar-initials"
import { Badge } from "@/components/ui/badge"
import {
  formatUSD,
  formatDate,
  formatLongDate,
  formatMonthYear,
  formatPercent,
  formatRelativeTime,
} from "@/lib/format"

import { ApplyPointsRuleDialog } from "./apply-points-rule-dialog"
import { CopyButton } from "./copy-button"
import { HeroMoreAttributes } from "./hero-more-attributes"
import { SendPromotionDialog } from "./send-promotion-dialog"
import { avatarPalette } from "../lib/avatar-palette"
import {
  ACQUISITION_CHANNEL_LABEL,
  DOCUMENT_TYPE_SHORT_LABEL,
  GENDER_LABEL,
  LANGUAGE_LABEL,
  MARITAL_STATUS_LABEL,
  MEMBER_STATUS_LABEL,
  SALES_CHANNEL_LABEL,
  TIER_LABEL,
} from "../lib/labels"
import {
  calculateCompleteness,
  isAtRiskOfTierDowngrade,
  isVip,
  formatTenure,
  getQualificationPeriod,
  type AssignablePromotion,
  type Member,
  type PurchaseBehavior,
  type RfmProfile,
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

type MemberHeroProps = {
  member: Member
  behavior: PurchaseBehavior
  rfm: RfmProfile | null
  promotionsForAssignment: AssignablePromotion[]
  canAssignPromotion: boolean
  canApplyPointsRule: boolean
}

/**
 * Figma "Hero" (1142:4595) pixel-perfect: identidad + acciones, luego
 * IDENTIDAD / RELACIÓN CON LA MARCA / PERFIL COMERCIAL, y la barra
 * "Ver N atributos más" del pie. "Enviar promoción"/"Aplicar regla" son los
 * 2 botones visibles del Figma — ninguno "envía" ni "aplica" nada en el
 * sentido literal (este proyecto no tiene motor de mensajería ni de
 * reglas real, `/reglas` es un placeholder de Fase 5): son una asignación
 * manual de promoción (`SendPromotionDialog`) y un ajuste manual de puntos
 * (`ApplyPointsRuleDialog`), los únicos alcances que se apoyan en
 * infraestructura real (`member_promociones`, `points_ledger`). Cada uno
 * se oculta si el rol del usuario no tiene el permiso correspondiente —
 * nunca se abre un diálogo solo para mostrar "no tienes permiso". Sin
 * opción de editar cliente en esta pantalla (decisión de producto) —
 * `/clientes/[id]/editar` queda sin entrada desde aquí.
 */
export function MemberHero({
  member,
  behavior,
  rfm,
  promotionsForAssignment,
  canAssignPromotion,
  canApplyPointsRule,
}: MemberHeroProps) {
  const fullName = `${member.nombre} ${member.apellido}`.trim()
  const palette = avatarPalette(member.id)
  const completeness = calculateCompleteness(member)
  const vip = isVip(member.tier?.nombre)
  const atRisk = isAtRiskOfTierDowngrade(member)
  const { daysRemaining } = getQualificationPeriod()
  const document = member.numero_documento
    ? `${member.tipo_documento ? `${DOCUMENT_TYPE_SHORT_LABEL[member.tipo_documento as keyof typeof DOCUMENT_TYPE_SHORT_LABEL]} ` : ""}${member.numero_documento}`
    : "—"

  const moreAttributeFields = (
    <>
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
        icon={User}
        label="Género"
        value={
          member.genero
            ? GENDER_LABEL[member.genero as keyof typeof GENDER_LABEL]
            : "—"
        }
      />
      <HeroField
        icon={ShoppingBag}
        label="Preferencia de compra"
        value={dash(member.preferencia_compra)}
      />
      <HeroField icon={Baby} label="Hijos" value={yesNo(member.tiene_hijos)} />
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
      <HeroField
        icon={Store}
        label="Tienda habitual"
        value={behavior.usualStore ? behavior.usualStore.name : "—"}
      />
      <HeroField
        icon={Receipt}
        label="Ticket promedio"
        value={
          behavior.totalOrders > 0 ? formatUSD(behavior.averageTicket) : "—"
        }
      />
      <HeroField
        icon={History}
        label="Última compra"
        value={
          behavior.lastPurchase
            ? formatRelativeTime(behavior.lastPurchase)
            : "—"
        }
      />
      <HeroField
        icon={CalendarClock}
        label="Próxima estimada"
        value={
          behavior.nextEstimated ? formatDate(behavior.nextEstimated) : "—"
        }
      />
    </>
  )

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
          {canAssignPromotion && (
            <SendPromotionDialog
              memberId={member.id}
              promotions={promotionsForAssignment}
            />
          )}
          {canApplyPointsRule && (
            <ApplyPointsRuleDialog
              memberId={member.id}
              currentBalance={member.saldo_puntos}
            />
          )}
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
            icon={Smartphone}
            label="Canal preferido"
            value={
              behavior.preferredChannel
                ? (SALES_CHANNEL_LABEL[
                    behavior.preferredChannel
                      .channel as keyof typeof SALES_CHANNEL_LABEL
                  ] ?? behavior.preferredChannel.channel)
                : "—"
            }
          />
          <HeroField
            icon={Languages}
            label="Idioma"
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
            icon={Award}
            label="Segmento RFM"
            value={rfm ? `${rfm.label} · ${rfm.scores.join("-")}` : "—"}
          />
          <HeroField
            icon={Tag}
            label="Etiquetas"
            value={
              behavior.topCategoryNames.length > 0
                ? behavior.topCategoryNames.join(" · ")
                : "—"
            }
          />
          <HeroField
            icon={Megaphone}
            label="Origen de captación"
            value={
              member.canal_adquisicion
                ? ACQUISITION_CHANNEL_LABEL[
                    member.canal_adquisicion as keyof typeof ACQUISITION_CHANNEL_LABEL
                  ]
                : "—"
            }
          />
          <HeroField
            icon={Repeat}
            label="Frecuencia"
            value={
              behavior.monthlyFrequency
                ? `${behavior.monthlyFrequency.toFixed(1)} compras / mes`
                : "—"
            }
          />
          <HeroField
            icon={Tag}
            label="Categoría dominante"
            value={
              behavior.dominantCategory
                ? `${behavior.dominantCategory.name} · ${formatPercent(behavior.dominantCategory.percentage)} del gasto`
                : "—"
            }
          />
          {/* No hay tabla de campañas/journeys por socio en este proyecto
              (`workflow_runs` no se usa para esto; el módulo de cupones
              trackea cupones, no campañas) — la única pista real
              (`points_ledger.origen` en texto libre) solo existe para 2 de
              13 socios y solo matchea por similitud de string, no por FK.
              Encadenar eso sería inventar una relación; se deja honesto. */}
          <HeroField icon={CalendarClock} label="Última campaña" value="—" />
        </div>
      </div>

      <HeroMoreAttributes count={11} fields={moreAttributeFields} />
    </div>
  )
}
