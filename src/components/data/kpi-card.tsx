type KpiCardProps = {
  etiqueta: string
  valor: string
  detalle?: string
}

/** Figma "KPI" (626:319 y análogos): tarjeta blanca, valor 26px semibold. */
export function KpiCard({ etiqueta, valor, detalle }: KpiCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-background px-[18px] py-4 shadow-form-section">
      <p className="text-xs font-medium text-muted-foreground">{etiqueta}</p>
      <p className="text-[26px] leading-8 font-semibold text-foreground">
        {valor}
      </p>
      {detalle && (
        <p className="text-[11px] text-muted-foreground">{detalle}</p>
      )}
    </div>
  )
}
