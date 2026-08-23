import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

type IntegracionesRailProps = {
  labelTodos: string
  modo: "todas" | "mias"
  onModoChange: (modo: "todas" | "mias") => void
  categorias: { nombre: string; total: number }[]
  categoriaActiva: string | null
  onCategoriaChange: (categoria: string | null) => void
}

/**
 * Figma "Rail · categorías" (1262:4234 / 1265:4519). El archivo trae 8
 * categorías con conteos que no cuadran con los 3 grupos que sí dibuja la
 * grilla (12 tarjetas en total) — se reemplazan por las categorías reales
 * de `catalogo.ts` para que el filtro funcione de verdad en vez de prometer
 * resultados que no existen.
 */
export function IntegracionesRail({
  labelTodos,
  modo,
  onModoChange,
  categorias,
  categoriaActiva,
  onCategoriaChange,
}: IntegracionesRailProps) {
  return (
    <div className="flex w-[190px] shrink-0 flex-col gap-3.5 rounded-2xl bg-background p-3.5 shadow-form-section">
      <RadioGroup
        value={modo}
        onValueChange={(value) => onModoChange(value as "todas" | "mias")}
        className="gap-2.5"
      >
        <label className="flex items-center gap-2">
          <RadioGroupItem value="todas" className="size-[14px]" />
          <span className="text-[11.5px] leading-4 font-semibold text-foreground">
            {labelTodos}
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
          onClick={() => onCategoriaChange(null)}
          className={cn(
            "flex w-full items-center rounded-lg px-[9px] py-1.5 text-[11.5px]",
            categoriaActiva === null
              ? "bg-accent font-semibold text-primary"
              : "text-secondary-foreground hover:bg-muted"
          )}
        >
          Todas
        </button>
        {categorias.map((categoria) => (
          <button
            key={categoria.nombre}
            type="button"
            onClick={() => onCategoriaChange(categoria.nombre)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-lg px-[9px] py-1.5 text-[11.5px]",
              categoriaActiva === categoria.nombre
                ? "bg-accent font-semibold text-primary"
                : "text-secondary-foreground hover:bg-muted"
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {categoria.nombre}
            </span>
            <span className="font-mono text-[9.5px] text-muted-foreground">
              {categoria.total}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
