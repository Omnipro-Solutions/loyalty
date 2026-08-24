"use client"

import { ServerCrash } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { EmptyState } from "@/components/feedback/empty-state"
import { AppPage } from "@/components/layout/app-page"
import { Button } from "@/components/ui/button"

/** Boundary de errores dentro del shell autenticado: una página rota no tira abajo el sidebar/topbar, así el usuario nunca pierde la navegación. */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <AppPage title="Algo salió mal">
      <div className="flex flex-1 items-center justify-center rounded-2xl bg-background shadow-form-section">
        <EmptyState
          icon={ServerCrash}
          title="Algo salió mal"
          description="No pudimos cargar esta sección. Intenta de nuevo en unos segundos."
        >
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/resumen" />}
            >
              Volver al resumen
            </Button>
            <Button onClick={() => retry()}>Reintentar</Button>
          </div>
        </EmptyState>
      </div>
    </AppPage>
  )
}
