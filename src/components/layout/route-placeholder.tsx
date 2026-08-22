import { Hammer } from "lucide-react"

import { EmptyState } from "@/components/feedback/empty-state"

/** Contenido temporal para rutas de `(app)` que aún no tienen su Fase construida. */
export function RoutePlaceholder({ fase }: { fase: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-2xl bg-background">
      <EmptyState
        icon={Hammer}
        titulo="Todavía no construida"
        descripcion={`Esta vista llega en la ${fase} del plan.`}
      />
    </div>
  )
}
