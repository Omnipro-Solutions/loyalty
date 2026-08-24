import { AppTopbar } from "@/components/layout/app-topbar"
import { JourneyEditorSkeleton } from "@/features/builder/canvas/journey-editor-skeleton"

/** No usa `AppPage` — el canvas de `@xyflow/react` es full-bleed, igual que `JourneyEditor` real. Título dinámico (nombre del workflow) → placeholder de texto. */
export default function JourneyEditorLoading() {
  return (
    <>
      <AppTopbar
        breadcrumb="Comercial  ›  Loyalty Builder"
        title="Cargando workflow…"
        className="shrink-0"
      />
      <JourneyEditorSkeleton />
    </>
  )
}
