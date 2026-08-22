import { Bell, HelpCircle, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type AppTopbarProps = {
  breadcrumb?: string
  titulo: string
  className?: string
}

/** Figma "Layout / Topbar" (624:614): 68px, px-7 pt-[18px] pb-4, gap-4. */
export function AppTopbar({ breadcrumb, titulo, className }: AppTopbarProps) {
  return (
    <div
      className={cn(
        "flex h-[68px] w-full items-center gap-4 px-7 pt-[18px] pb-4",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumb && (
          <p className="truncate text-[11px] leading-[14px] text-muted-foreground">
            {breadcrumb}
          </p>
        )}
        <p className="truncate text-[18px] leading-6 font-semibold text-foreground">
          {titulo}
        </p>
      </div>

      <div className="flex h-9 w-[260px] shrink-0 items-center gap-2 rounded-full bg-background px-4 py-2.5 shadow-topbar-control">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar…"
          className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <Button
        variant="ghost"
        size="icon-lg"
        title="Notificaciones"
        className="rounded-full bg-background shadow-topbar-control"
      >
        <Bell className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        title="Ayuda"
        className="rounded-full bg-background shadow-topbar-control"
      >
        <HelpCircle className="size-4" />
      </Button>
    </div>
  )
}
