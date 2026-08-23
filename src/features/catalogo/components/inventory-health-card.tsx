import { formatPorcentaje } from "@/lib/format"
import { cn } from "@/lib/utils"

type Bandas = { success: number; warning: number; destructive: number }

type InventoryHealthCardProps = {
  promedio: number
  bandas: Bandas
}

const LEYENDA: { key: keyof Bandas; color: string; texto: string }[] = [
  { key: "success", color: "bg-success", texto: "90–100 %" },
  { key: "warning", color: "bg-warning", texto: "70–90 %" },
  { key: "destructive", color: "bg-destructive", texto: "< 70 %" },
]

/** Figma "KPI · Salud del inventario" (626:331): bandas apiladas + leyenda con dots. */
export function InventoryHealthCard({
  promedio,
  bandas,
}: InventoryHealthCardProps) {
  const total = bandas.success + bandas.warning + bandas.destructive || 1

  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-background px-[18px] py-4 shadow-form-section">
      <p className="text-xs font-medium text-muted-foreground">
        Salud del inventario
      </p>
      <div className="flex items-center gap-2">
        <p className="text-[26px] leading-8 font-semibold text-foreground">
          {formatPorcentaje(promedio)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          completitud de datos
        </p>
      </div>
      <div className="flex w-full gap-0.5">
        {LEYENDA.map(({ key, color }) => (
          <div
            key={key}
            className={cn("h-1.5 rounded-[3px]", color)}
            style={{ width: `${(bandas[key] / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3.5">
        {LEYENDA.map(({ key, color, texto }) => (
          <div key={key} className="flex items-center gap-1">
            <span className={cn("size-1.5 rounded-full", color)} />
            <span className="text-[10px] font-medium text-muted-foreground">
              {texto}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
