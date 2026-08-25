type CouponVoucherProps = {
  headline: string
  subtitle: string
  code: string
  /** SVG ya renderizado — server-side (`qrcode`/`bwip-js` en Node) o cliente (mismas librerías, build de navegador), según quién lo genere. */
  qrSvg: string
  barcodeSvg: string
  validitySummary: string
}

/**
 * El vale (Figma 13.3 "Previsualización" y 13.4 "Vale") — compartido entre
 * la previsualización en vivo del asistente y el detalle del cupón. Recibe
 * el QR y el código de barras ya como SVG (string) para no decidir aquí
 * dónde se generan: en el asistente (cliente, reactivo a cada tecla) y en
 * el detalle (servidor, una sola vez) el mecanismo difiere, pero el
 * componente visual es el mismo. Tinta fija en negro/blanco puro dentro del
 * panel blanco — es una zona pensada para imprimirse, debe seguir siendo
 * escaneable sin importar el tema.
 */
export function CouponVoucher({
  headline,
  subtitle,
  code,
  qrSvg,
  barcodeSvg,
  validitySummary,
}: CouponVoucherProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-2xl bg-primary px-5 py-6 text-primary-foreground">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-[32px] leading-9 font-bold">{headline}</p>
        <p className="text-xs text-primary-foreground/80">{subtitle}</p>
      </div>

      <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-background px-4 py-4">
        <p className="font-mono text-xs font-medium text-foreground">{code}</p>
        {barcodeSvg && (
          <div
            className="h-10 w-full max-w-[220px] [&_svg]:h-full [&_svg]:w-full"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: barcodeSvg }}
          />
        )}
        {qrSvg && (
          <div
            className="size-24 [&_svg]:size-full"
            aria-label={`Código QR del cupón ${code}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        )}
      </div>

      <p className="text-center text-[11px] text-primary-foreground/80">
        {validitySummary}
      </p>
    </div>
  )
}
