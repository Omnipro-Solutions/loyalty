import { Skeleton } from "@/components/feedback/skeleton"

/**
 * `JourneyEditor` es full-bleed (`@xyflow/react`, sin `AppPage`): barra
 * superior (`EditorBar`, `border-b px-6 py-3`), paleta de bloques a la
 * izquierda (`BlockPalette`, `w-[220px] border-r`) y el canvas a la derecha.
 * Aproximación deliberadamente sobria — no intenta simular nodos/conexiones.
 */
export function JourneyEditorSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-4 border-b border-border bg-background px-6 py-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <div className="ml-auto flex items-center gap-2.5">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex h-full w-[220px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-background p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="min-w-0 flex-1 bg-muted/40" />
      </div>
    </div>
  )
}
