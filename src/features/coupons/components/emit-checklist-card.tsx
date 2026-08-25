import { cn } from "@/lib/utils"

type ChecklistItem = {
  message: string
  action?: { label: string; onClick: () => void }
}

type EmitChecklistCardProps = { items: ChecklistItem[] }

/** Figma 13.3 "Card · Bloqueos" ("Antes de emitir") — punto verde sin acción cuando ya está resuelto, ámbar con acción cuando falta algo. */
export function EmitChecklistCard({ items }: EmitChecklistCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-background p-4 shadow-form-section">
      <p className="text-[13px] font-semibold text-foreground">
        Antes de emitir
      </p>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div
            key={item.message}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  item.action ? "bg-warning" : "bg-success"
                )}
              />
              <p className="truncate text-xs text-foreground">{item.message}</p>
            </div>
            {item.action && (
              <button
                type="button"
                onClick={item.action.onClick}
                className="shrink-0 text-xs font-medium text-primary"
              >
                {item.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
