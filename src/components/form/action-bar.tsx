import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ActionBarProps = {
  hint?: string
  onCancel?: () => void
  onSaveDraft?: () => void
  onSaveAndActivate?: () => void
  className?: string
}

const COMPACT = "h-auto rounded-lg px-[15px] py-2.5 text-xs leading-[17px]"

/** Figma "Form / Barra de acciones" (711:386): floating, rounded-[20px], upward shadow. */
export function ActionBar({
  hint = "Los cambios se aplican al guardar",
  onCancel,
  onSaveDraft,
  onSaveAndActivate,
  className,
}: ActionBarProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[20px] bg-background px-[22px] py-3.5 shadow-action-bar",
        className
      )}
    >
      <p className="min-w-0 flex-1 text-[11px] leading-4 text-muted-foreground">
        {hint}
      </p>
      <Button
        variant="ghost"
        onClick={onCancel}
        className={cn(COMPACT, "font-medium")}
      >
        Cancelar
      </Button>
      <Button
        variant="outline"
        onClick={onSaveDraft}
        className={cn(COMPACT, "font-medium")}
      >
        Guardar borrador
      </Button>
      <Button
        onClick={onSaveAndActivate}
        className={cn(COMPACT, "font-semibold")}
      >
        Guardar y activar
      </Button>
    </div>
  )
}
