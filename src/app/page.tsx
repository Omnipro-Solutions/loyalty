import { redirect } from "next/navigation"

// `proxy.ts` ya exige sesión aal2 antes de llegar aquí — si se renderiza
// esta página es porque el usuario está autenticado.
export default function RootPage() {
  redirect("/resumen")
}
