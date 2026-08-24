import { SearchX } from "lucide-react"
import Link from "next/link"

import { ErrorPage } from "@/components/feedback/error-page"
import { Button } from "@/components/ui/button"

/** 404 para cualquier URL sin match (sin sesión o fuera de `(app)`/`(auth)`) — ver `(app)/not-found.tsx` para el equivalente dentro del shell. */
export default function NotFound() {
  return (
    <ErrorPage
      icon={SearchX}
      title="Página no encontrada"
      description="La dirección a la que intentaste entrar no existe o fue movida."
    >
      <Button nativeButton={false} render={<Link href="/" />}>
        Volver al inicio
      </Button>
    </ErrorPage>
  )
}
