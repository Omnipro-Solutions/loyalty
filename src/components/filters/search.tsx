import { Search as SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Figma "Filtro / Buscador" (699:330): bordered pill, no shadow (unlike the topbar's search). */
export function FilterSearch({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <div
      className={cn(
        "flex w-[260px] items-center gap-2 rounded-full border border-border bg-background px-3.5 py-[9px] focus-within:border-2 focus-within:border-ring",
        className
      )}
    >
      <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        type="search"
        placeholder="Buscar…"
        className="min-w-0 flex-1 bg-transparent text-xs leading-4 text-foreground outline-none placeholder:text-muted-foreground"
        {...props}
      />
    </div>
  )
}
