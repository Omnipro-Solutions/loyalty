import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

type IntegrationsRailProps = {
  allLabel: string
  mode: "todas" | "mias"
  onModeChange: (mode: "todas" | "mias") => void
  categories: { name: string; total: number }[]
  activeCategory: string | null
  onCategoryChange: (category: string | null) => void
}

/**
 * Figma "Rail · categorías" (1262:4234 / 1265:4519). El archivo trae 8
 * categorías con conteos que no cuadran con los 3 grupos que sí dibuja la
 * grilla (12 tarjetas en total) — se reemplazan por las categorías reales
 * de `catalog.ts` para que el filtro funcione de verdad en vez de prometer
 * resultados que no existen.
 */
export function IntegrationsRail({
  allLabel,
  mode,
  onModeChange,
  categories,
  activeCategory,
  onCategoryChange,
}: IntegrationsRailProps) {
  return (
    <div className="flex w-[190px] shrink-0 flex-col gap-3.5 rounded-2xl bg-background p-3.5 shadow-form-section">
      <RadioGroup
        value={mode}
        onValueChange={(value) => onModeChange(value as "todas" | "mias")}
        className="gap-2.5"
      >
        <label className="flex items-center gap-2">
          <RadioGroupItem value="todas" className="size-[14px]" />
          <span className="text-[11.5px] leading-4 font-semibold text-foreground">
            {allLabel}
          </span>
        </label>
        <label className="flex items-center gap-2">
          <RadioGroupItem value="mias" className="size-[14px]" />
          <span className="text-[11.5px] leading-4 text-secondary-foreground">
            Mis conexiones
          </span>
        </label>
      </RadioGroup>
      <div className="h-px w-full bg-muted" />
      <div className="flex flex-col gap-0.5">
        <p className="px-[9px] pb-1.5 text-[9px] font-semibold tracking-[0.5px] text-muted-foreground">
          CATEGORÍAS
        </p>
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          className={cn(
            "flex w-full items-center rounded-lg px-[9px] py-1.5 text-[11.5px]",
            activeCategory === null
              ? "bg-accent font-semibold text-primary"
              : "text-secondary-foreground hover:bg-muted"
          )}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.name}
            type="button"
            onClick={() => onCategoryChange(category.name)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-lg px-[9px] py-1.5 text-[11.5px]",
              activeCategory === category.name
                ? "bg-accent font-semibold text-primary"
                : "text-secondary-foreground hover:bg-muted"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {category.name}
            </span>
            <span className="font-mono text-[9.5px] text-muted-foreground">
              {category.total}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
