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
import { formatFechaLarga, formatMesAnio, formatPorcentaje } from "@/lib/format"

import { CopyButton } from "./copy-button"
import { paletaAvatar } from "../lib/avatar-palette"
import {
  CANAL_ADQUISICION_LABEL,
  DOCUMENTO_TIPO_CORTO,
  ESTADO_CIVIL_LABEL,
  IDIOMA_LABEL,
  MEMBER_ESTADO_LABEL,
  TIER_LABEL,
} from "../lib/labels"
import {
  calcularCompletitud,
  enRiesgoDeBajaDeNivel,
  esVip,
  formatAntiguedad,
  getPeriodoCalificacion,
  type Member,
} from "../lib/queries"

function guion(valor: string | null | undefined): string {
  return valor && valor.length > 0 ? valor : "—"
}

function siNo(valor: boolean | null): string {
  return valor === null ? "—" : valor ? "Sí" : "No"
}

function CampoHero({
  icon: Icon,
  etiqueta,
  valor,
  accion,
}: {
  icon: LucideIcon
  etiqueta: string
  valor: ReactNode
  accion?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <p className="truncate text-[10px] text-muted-foreground">{etiqueta}</p>
      </div>
      <div className="flex items-center gap-1 pl-5">
        <p className="truncate text-xs font-semibold text-foreground">
          {valor}
        </p>
        {accion}
      </div>
    </div>
  )
}

function TituloSeccion({ children }: { children: ReactNode }) {
  return (
    <p className="w-full text-[9px] font-semibold tracking-[0.72px] text-muted-foreground uppercase">
      {children}
    </p>
  )
}

type ClienteHeroProps = { cliente: Member }

/**
 * Figma "Hero" (1142:4595) pixel-perfect: identidad + acciones, luego
 * IDENTIDAD / RELACIÓN CON LA MARCA / PERFIL COMERCIAL. Las dos últimas
 * secciones reemplazan el contenido de ejemplo del Figma (Segmento RFM,
 * frecuencia de compra, etc. — necesitan pedidos) por los atributos reales
 * del socio que sí existen en `members`.
 */
export function ClienteHero({ cliente }: ClienteHeroProps) {
  const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`.trim()
  const paleta = paletaAvatar(cliente.id)
  const completitud = calcularCompletitud(cliente)
  const vip = esVip(cliente.tier?.nombre)
  const enRiesgo = enRiesgoDeBajaDeNivel(cliente)
  const { diasRestantes } = getPeriodoCalificacion()
  const documento = cliente.numero_documento
    ? `${cliente.tipo_documento ? `${DOCUMENTO_TIPO_CORTO[cliente.tipo_documento as keyof typeof DOCUMENTO_TIPO_CORTO]} ` : ""}${cliente.numero_documento}`
    : "—"

  return (
    <div className="flex size-full flex-col justify-between gap-3.5 rounded-[20px] bg-background px-5 py-4 shadow-form-section">
      <div className="flex w-full flex-col items-center gap-3.5">
        <div className="flex w-full items-center gap-3.5">
          <AvatarInitials
            nombre={nombreCompleto}
            size={56}
            bgClassName={paleta.bg}
            fgClassName={paleta.fg}
            textClassName="text-xl leading-[26px]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-xl font-bold tracking-[-0.4px] text-foreground">
                {nombreCompleto}
              </p>
              {vip && <Badge variant="info">VIP</Badge>}
              {cliente.tier && (
                <Badge variant="info">
                  {TIER_LABEL[cliente.tier.nombre as keyof typeof TIER_LABEL] ??
                    cliente.tier.nombre}
                </Badge>
              )}
              {enRiesgo && (
                <Badge variant="warning">Riesgo de baja de nivel</Badge>
              )}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              Calificación cierra 31 dic · {diasRestantes} días
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<Link href={`/clientes/${cliente.id}/editar`} />}
          >
            <Pencil className="size-3.5" />
            Editar cliente
          </Button>
        </div>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="flex w-full flex-col gap-2.5">
        <TituloSeccion>Identidad</TituloSeccion>
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
          <CampoHero icon={User} etiqueta="Nombre" valor={nombreCompleto} />
          <CampoHero icon={IdCard} etiqueta="Documento" valor={documento} />
          <CampoHero
            icon={Calendar}
            etiqueta="Nacimiento"
            valor={
              cliente.fecha_nacimiento
                ? formatFechaLarga(cliente.fecha_nacimiento)
                : "—"
            }
          />
          <CampoHero
            icon={Mail}
            etiqueta="Correo"
            valor={cliente.email}
            accion={<CopyButton valor={cliente.email} />}
          />
          <CampoHero
            icon={Phone}
            etiqueta="Teléfono"
            valor={guion(cliente.telefono)}
            accion={
              cliente.telefono ? <CopyButton valor={cliente.telefono} /> : null
            }
          />
          <CampoHero
            icon={Map}
            etiqueta="Provincia"
            valor={guion(cliente.provincia)}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <TituloSeccion>Relación con la marca</TituloSeccion>
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
          <CampoHero
            icon={Hash}
            etiqueta="ID de socio"
            valor={<span className="font-mono">{cliente.codigo_socio}</span>}
          />
          <CampoHero
            icon={Store}
            etiqueta="Tienda"
            valor={
              cliente.tiendaInscripcion
                ? `${cliente.tiendaInscripcion.nombre} · ${formatMesAnio(cliente.fecha_alta)}`
                : "—"
            }
          />
          <CampoHero
            icon={Clock}
            etiqueta="Antigüedad"
            valor={formatAntiguedad(cliente.fecha_alta)}
          />
          <CampoHero
            icon={Megaphone}
            etiqueta="Canal de adquisición"
            valor={
              cliente.canal_adquisicion
                ? CANAL_ADQUISICION_LABEL[
                    cliente.canal_adquisicion as keyof typeof CANAL_ADQUISICION_LABEL
                  ]
                : "—"
            }
          />
          <CampoHero
            icon={Languages}
            etiqueta="Idioma"
            valor={IDIOMA_LABEL[cliente.idioma as keyof typeof IDIOMA_LABEL]}
          />
          <CampoHero
            icon={ShieldCheck}
            etiqueta="Perfil unificado"
            valor={`${completitud.llenos} de ${completitud.total} atributos · ${formatPorcentaje(completitud.porcentaje)}`}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <TituloSeccion>Perfil comercial</TituloSeccion>
        <div className="grid w-full grid-cols-2 gap-x-3 gap-y-3.5 md:grid-cols-3">
          <CampoHero
            icon={Heart}
            etiqueta="Estado civil"
            valor={
              cliente.estado_civil
                ? ESTADO_CIVIL_LABEL[
                    cliente.estado_civil as keyof typeof ESTADO_CIVIL_LABEL
                  ]
                : "—"
            }
          />
          <CampoHero
            icon={ShoppingBag}
            etiqueta="Preferencia de compra"
            valor={guion(cliente.preferencia_compra)}
          />
          <CampoHero
            icon={Baby}
            etiqueta="Hijos"
            valor={siNo(cliente.tiene_hijos)}
          />
          <CampoHero
            icon={PawPrint}
            etiqueta="Mascotas"
            valor={siNo(cliente.tiene_mascotas)}
          />
          <CampoHero
            icon={Mail}
            etiqueta="Consentimiento de marketing"
            valor={
              cliente.consentimiento_marketing ? "Otorgado" : "No otorgado"
            }
          />
          <CampoHero
            icon={ShieldCheck}
            etiqueta="Estado de cuenta"
            valor={
              MEMBER_ESTADO_LABEL[
                cliente.estado_cuenta as keyof typeof MEMBER_ESTADO_LABEL
              ]
            }
          />
        </div>
      </div>
    </div>
  )
}
