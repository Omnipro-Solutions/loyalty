type KpiCardProps = {
  label: string
  value: string
  detail?: string
}

/** Figma "KPI" (626:319 and analogous): white card, 26px semibold value. */
export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-background px-[18px] py-4 shadow-form-section">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-[26px] leading-8 font-semibold text-foreground">
        {value}
      </p>
      {detail && <p className="text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  )
}
