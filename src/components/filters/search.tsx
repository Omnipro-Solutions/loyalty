import { Loader2, Search as SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type FilterSearchProps = React.ComponentProps<"input"> & {
  /**
   * Mientras la consulta corre. Reemplaza la lupa por un spinner en el mismo
   * hueco —mismo tamaño, misma posición— para que el campo no salte: el
   * indicador tiene que contar lo que pasa, no mover la interfaz.
   */
  loading?: boolean
}

/** Figma "Filtro / Buscador" (699:330): bordered pill, no shadow (unlike the topbar's search). */
export function FilterSearch({
  className,
  loading = false,
  ...props
}: FilterSearchProps) {
  return (
    <div
      className={cn(
        "flex w-[260px] max-w-full items-center gap-2 rounded-full border border-border bg-background px-3.5 py-[9px] focus-within:border-2 focus-within:border-ring",
        className
      )}
    >
      {loading ? (
        <Loader2
          className="size-3.5 shrink-0 animate-spin text-primary"
          aria-hidden="true"
        />
      ) : (
        <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <input
        type="search"
        placeholder="Buscar…"
        className="min-w-0 flex-1 bg-transparent text-xs leading-4 text-foreground outline-none placeholder:text-muted-foreground"
        {...props}
      />
      {/* El spinner es decorativo para un lector de pantalla; lo que hay que
          anunciar es que el resultado está por cambiar. */}
      <span aria-live="polite" className="sr-only">
        {loading ? "Buscando…" : ""}
      </span>
    </div>
  )
}
