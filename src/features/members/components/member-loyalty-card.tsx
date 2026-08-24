import { Gem } from "lucide-react"
import QRCode from "qrcode"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format"

import { MEMBER_STATUS_LABEL, TIER_LABEL } from "../lib/labels"
import { getQualificationPeriod, type Member } from "../lib/queries"

const STATUS_BADGE_VARIANT = {
  activo: "success",
  inactivo: "neutral",
  suspendido: "error",
} as const

function cardNumber(memberCode: string): string {
  const number = memberCode.replace(/^CLI-0*/, "")
  return `LT-${number || "0"}`
}

function StatusRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-2">
      <p className="flex-1 truncate text-[11px] text-muted-foreground">
        {label}
      </p>
      {value}
    </div>
  )
}

type MemberLoyaltyCardProps = { member: Member }

/**
 * Figma "Card · Tarjeta de lealtad" (1171:6) pixel-perfect, salvo el QR:
 * el Figma implica un token que rota cada 60s (lector de POS real) — no
 * existe esa infraestructura, así que el QR codifica el `codigo_socio` de
 * forma estática (identifica al socio, pero no expira ni rota).
 *
 * El degradado usa `--gradient-loyalty-card` (hex fijos en globals.css), no
 * las clases `from-primary-900/via-primary-700/to-primary`: esos tokens se
 * invierten en `.dark` (ahí sirven de tinte claro para texto sobre fondo
 * oscuro) y dejaban la card lavanda y deslavada — una tarjeta física no
 * debe cambiar de "material" con el tema de la app.
 */
export async function MemberLoyaltyCard({ member }: MemberLoyaltyCardProps) {
  const { endDate } = getQualificationPeriod()
  const validityLabel = `${String(endDate.getMonth() + 1).padStart(2, "0")}/${endDate.getFullYear()}`
  const status = member.estado_cuenta as keyof typeof STATUS_BADGE_VARIANT
  // Tinta del QR fija en negro/blanco puro (no tokens de tema): es una zona
  // impresa real de la tarjeta — debe seguir siendo escaneable sin importar
  // claro/oscuro, igual que el panel blanco que la contiene.
  const qrSvg = await QRCode.toString(member.codigo_socio, {
    type: "svg",
    margin: 1,
    width: 100,
    color: { dark: "#000000", light: "#ffffff" },
  })

  return (
    <div className="flex size-full flex-col items-center gap-3.5 rounded-[20px] bg-background p-[18px] shadow-form-section">
      <div
        className="flex w-full flex-col gap-3 rounded-[20px] p-4 shadow-lg"
        style={{ backgroundImage: "var(--gradient-loyalty-card)" }}
      >
        <div className="flex w-full items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-[18px] font-semibold text-white">
              Loyalty System
            </p>
            <p className="text-[8px] leading-[11px] text-white/65">
              Omni · Programa de lealtad
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end whitespace-nowrap">
            <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
              PUNTOS
            </p>
            <p className="text-[16px] leading-5 font-semibold text-white">
              {formatNumber(member.saldo_puntos)}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-1 rounded-[14px] bg-gradient-to-r from-white/20 to-white/[0.06] px-4 py-[18px]">
          <Gem className="size-4 text-white" />
          <p className="text-sm leading-[19px] font-semibold whitespace-nowrap text-white">
            {member.tier
              ? `Nivel ${TIER_LABEL[member.tier.nombre as keyof typeof TIER_LABEL] ?? member.tier.nombre}`
              : "Sin nivel"}
          </p>
          <p className="text-[9px] leading-3 whitespace-nowrap text-white/70">
            {member.tier
              ? `Vigente hasta ${validityLabel} · multiplicador ${member.tier.multiplicador}x`
              : "Sin nivel asignado"}
          </p>
        </div>

        <div className="flex w-full items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
              TITULAR
            </p>
            <p className="truncate text-[13px] leading-[18px] font-semibold text-white">
              {member.nombre} {member.apellido}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end whitespace-nowrap">
            <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
              ID SOCIO
            </p>
            <p className="font-mono text-[13px] leading-[18px] font-semibold text-white">
              {member.codigo_socio}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-2 rounded-[14px] bg-white px-3.5 py-3">
          <div
            className="size-[100px] [&_svg]:size-full"
            aria-label={`Código QR del socio ${member.codigo_socio}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="font-mono text-[11px] tracking-[0.44px] text-black">
            {cardNumber(member.codigo_socio)}
          </p>
        </div>
        <p className="w-full text-center text-[8px] leading-[11px] text-white">
          Identificación del socio en tienda
        </p>
      </div>

      <div className="flex w-full flex-1 flex-col justify-end gap-3.5">
        <div className="h-px w-full bg-border" />
        <p className="w-full text-xs font-semibold text-foreground">
          Estado de la tarjeta
        </p>
        <div className="flex w-full flex-col gap-2.5">
          <StatusRow
            label="Actualización del pase"
            value={
              <Badge variant={STATUS_BADGE_VARIANT[status]}>
                {MEMBER_STATUS_LABEL[status]}
              </Badge>
            }
          />
          <StatusRow
            label="Número de tarjeta"
            value={
              <span className="font-mono text-[10px] text-secondary-foreground">
                {cardNumber(member.codigo_socio)}
              </span>
            }
          />
          <StatusRow
            label="Último escaneo"
            value={
              <span className="text-[11px] font-medium text-muted-foreground">
                Sin registros
              </span>
            }
          />
          <StatusRow
            label="Sucursal habitual"
            value={
              <span className="truncate text-[11px] font-medium text-foreground">
                {member.enrollmentStore?.nombre ?? "—"}
              </span>
            }
          />
        </div>
      </div>
    </div>
  )
}
