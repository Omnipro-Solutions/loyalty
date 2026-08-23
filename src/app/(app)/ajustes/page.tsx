import { redirect } from "next/navigation"

/** "Ajustes" (09 · Equipo y permisos, Figma) hoy solo tiene esa sub-vista construida — el resto de Configuración llega en la Fase 5. */
export default function AjustesPage() {
  redirect("/ajustes/equipo")
}
