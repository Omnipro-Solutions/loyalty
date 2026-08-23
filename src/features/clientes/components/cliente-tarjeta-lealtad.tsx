import { Gem, QrCode } from "lucide-react"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { formatNumero } from "@/lib/format"

import { MEMBER_ESTADO_LABEL, TIER_LABEL } from "../lib/labels"
import { getPeriodoCalificacion, type Member } from "../lib/queries"

const ESTADO_BADGE_VARIANT = {
  activo: "success",
  inactivo: "neutral",
  suspendido: "error",
} as const

function numeroDeTarjeta(codigoSocio: string): string {
  const numero = codigoSocio.replace(/^CLI-0*/, "")
  return `LT-${numero || "0"}`
}

function FilaEstado({
  etiqueta,
  valor,
}: {
  etiqueta: string
  valor: ReactNode
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <p className="flex-1 truncate text-[11px] text-muted-foreground">
        {etiqueta}
      </p>
      {valor}
    </div>
  )
}

type ClienteTarjetaLealtadProps = { cliente: Member }

/**
 * Figma "Card · Tarjeta de lealtad" (1171:6) pixel-perfect, salvo el QR:
 * el Figma implica un token que rota cada 60s (lector de POS real) — no
 * existe esa infraestructura, así que el recuadro es un ícono decorativo,
 * no un código escaneable de verdad.
 */
export function ClienteTarjetaLealtad({ cliente }: ClienteTarjetaLealtadProps) {
  const { fechaFin } = getPeriodoCalificacion()
  const vigenciaLabel = `${String(fechaFin.getMonth() + 1).padStart(2, "0")}/${fechaFin.getFullYear()}`
  const estado = cliente.estado_cuenta as keyof typeof ESTADO_BADGE_VARIANT

  return (
    <div className="flex size-full flex-col items-center gap-3.5 rounded-[20px] bg-background p-[18px] shadow-form-section">
      <div className="flex w-full flex-col gap-3 rounded-[20px] bg-gradient-to-br from-primary-900 via-primary-700 to-primary p-4 shadow-lg">
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
              {formatNumero(cliente.saldo_puntos)}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-1 rounded-[14px] bg-gradient-to-r from-white/20 to-white/[0.06] px-4 py-[18px]">
          <Gem className="size-4 text-white" />
          <p className="text-sm leading-[19px] font-semibold whitespace-nowrap text-white">
            {cliente.tier
              ? `Nivel ${TIER_LABEL[cliente.tier.nombre as keyof typeof TIER_LABEL] ?? cliente.tier.nombre}`
              : "Sin nivel"}
          </p>
          <p className="text-[9px] leading-3 whitespace-nowrap text-white/70">
            {cliente.tier
              ? `Vigente hasta ${vigenciaLabel} · multiplicador ${cliente.tier.multiplicador}x`
              : "Sin nivel asignado"}
          </p>
        </div>

        <div className="flex w-full items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
              TITULAR
            </p>
            <p className="truncate text-[13px] leading-[18px] font-semibold text-white">
              {cliente.nombre} {cliente.apellido}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end whitespace-nowrap">
            <p className="text-[8px] leading-[11px] font-medium tracking-[0.64px] text-white/60">
              ID SOCIO
            </p>
            <p className="font-mono text-[13px] leading-[18px] font-semibold text-white">
              {cliente.codigo_socio}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-2 rounded-[14px] bg-white px-3.5 py-3">
          <div className="flex size-[100px] items-center justify-center rounded-[10px] bg-muted">
            <QrCode className="size-10 text-muted-foreground" />
          </div>
          <p className="font-mono text-[11px] tracking-[0.44px] text-foreground">
            {numeroDeTarjeta(cliente.codigo_socio)}
          </p>
        </div>
        <p className="w-full text-center text-[8px] leading-[11px] text-white">
          Identificación del socio en tienda
        </p>
      </div>

      <div className="h-px w-full bg-border" />
      <p className="w-full text-xs font-semibold text-foreground">
        Estado de la tarjeta
      </p>
      <div className="flex w-full flex-col gap-2.5">
        <FilaEstado
          etiqueta="Actualización del pase"
          valor={
            <Badge variant={ESTADO_BADGE_VARIANT[estado]}>
              {MEMBER_ESTADO_LABEL[estado]}
            </Badge>
          }
        />
        <FilaEstado
          etiqueta="Número de tarjeta"
          valor={
            <span className="font-mono text-[10px] text-secondary-foreground">
              {numeroDeTarjeta(cliente.codigo_socio)}
            </span>
          }
        />
        <FilaEstado
          etiqueta="Último escaneo"
          valor={
            <span className="text-[11px] font-medium text-muted-foreground">
              Sin registros
            </span>
          }
        />
        <FilaEstado
          etiqueta="Sucursal habitual"
          valor={
            <span className="truncate text-[11px] font-medium text-foreground">
              {cliente.tiendaInscripcion?.nombre ?? "—"}
            </span>
          }
        />
      </div>
    </div>
  )
}
