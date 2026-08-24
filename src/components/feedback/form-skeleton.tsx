import { cn } from "@/lib/utils"

import { Skeleton } from "./skeleton"

type FormSkeletonProps = {
  /** Número de `Section` (ver `components/form/section.tsx`) a esqueletizar. */
  sections?: number
  /** Campos por sección — cada fila es 2 columnas, como `components/form/row.tsx`. */
  fieldsPerSection?: number
  className?: string
}

/**
 * `MemberForm`/`PromotionForm`/`StoreForm` son todos
 * `form.flex.w-full.flex-col.gap-5`: encabezado (título + Cancelar/Guardar) y
 * una pila de `Section` (`rounded-[20px] px-[22px] py-5 shadow-form-section`,
 * separador `h-px bg-border`, filas de `Field` en 2 columnas).
 */
export function FormSkeleton({
  sections = 3,
  fieldsPerSection = 4,
  className,
}: FormSkeletonProps) {
  return (
    <div
      className={cn("flex w-full flex-col gap-5", className)}
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      {Array.from({ length: sections }).map((_, s) => (
        <div
          key={s}
          className="flex w-full flex-col gap-4 rounded-[20px] bg-background px-[22px] py-5 shadow-form-section"
        >
          <Skeleton className="h-[15px] w-40" />
          <div className="h-px w-full bg-border" />
          <div className="grid w-full grid-cols-2 gap-3.5">
            {Array.from({ length: fieldsPerSection }).map((_, f) => (
              <div key={f} className="flex w-full flex-col gap-1.5">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
