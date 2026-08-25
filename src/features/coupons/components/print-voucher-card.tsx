type PrintVoucherCardProps = {
  headline: string
  subtitle: string
  code: string
  qrSvg: string
  validitySummary: string
}

/** Vale compacto para la cuadrícula de impresión (`grid_8`) — versión reducida de `CouponVoucher` (sin código de barras: a este tamaño no queda legible/escaneable). */
export function PrintVoucherCard({
  headline,
  subtitle,
  code,
  qrSvg,
  validitySummary,
}: PrintVoucherCardProps) {
  return (
    <div className="flex h-full break-inside-avoid flex-col items-center justify-between gap-2 rounded-xl border border-dashed border-neutral-300 p-3 text-center">
      <div>
        <p className="text-lg leading-tight font-bold text-neutral-900">
          {headline}
        </p>
        <p className="text-[9px] text-neutral-500">{subtitle}</p>
      </div>
      {qrSvg && (
        <div
          className="size-16 [&_svg]:size-full"
          aria-label={`Código QR del cupón ${code}`}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      )}
      <div>
        <p className="font-mono text-[10px] font-medium text-neutral-900">
          {code}
        </p>
        <p className="text-[8px] text-neutral-500">{validitySummary}</p>
      </div>
    </div>
  )
}
