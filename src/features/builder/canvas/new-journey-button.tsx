import { Plus } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

/**
 * Solo navega: la fila en `workflows` nace con el primer "Guardar" dentro
 * del editor (ver `createWorkflowAction`). Antes este botón insertaba el
 * borrador para poder redirigir a `/journeys/{id}`, y abrir el canvas y
 * salir dejaba una regla vacía en la lista.
 */
export function NewJourneyButton() {
  return (
    <Button nativeButton={false} render={<Link href="/journeys/nuevo" />}>
      <Plus className="size-4" />
      Nueva regla
    </Button>
  )
}
