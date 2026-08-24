import { SearchX } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/feedback/empty-state"
import { AppPage } from "@/components/layout/app-page"
import { Button } from "@/components/ui/button"

/** 404 dentro del shell autenticado: cubre tanto rutas `(app)` sin match como `notFound()` de un registro puntual (cliente, producto, journey, audiencia…). */
export default function NotFound() {
  return (
    <AppPage title="No encontrado">
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
        <EmptyState
          icon={SearchX}
          title="No encontramos lo que buscabas"
          description="El registro o la página que intentas abrir no existe, fue eliminado o no tienes acceso a él."
        >
          <Button nativeButton={false} render={<Link href="/resumen" />}>
            Volver al resumen
          </Button>
        </EmptyState>
      </div>
    </AppPage>
  )
}
