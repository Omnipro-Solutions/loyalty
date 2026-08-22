import { redirect } from "next/navigation"

// TODO(Fase 3): decidir el destino según sesión — sin auth aún, siempre
// entra a la app. `proxy.ts` se encargará de exigir sesión antes de esto.
export default function RootPage() {
  redirect("/resumen")
}
