"use client"

import { ServerCrash } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

import { ErrorPage } from "@/components/feedback/error-page"
import { Button } from "@/components/ui/button"

/** Boundary raíz: captura errores que escapan de `(app)/error.tsx` (p. ej. `(app)/layout.tsx`) o de `(auth)`. Para un crash del `layout.tsx` raíz, ver `global-error.tsx`. */
export default function RootError({
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
    <ErrorPage
      icon={ServerCrash}
      title="Algo salió mal"
      description="Ocurrió un error inesperado. Intenta de nuevo o vuelve más tarde."
    >
      <div className="flex gap-2.5">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Volver al inicio
        </Button>
        <Button onClick={() => retry()}>Reintentar</Button>
      </div>
    </ErrorPage>
  )
}
