import { CheckCircle2, OctagonAlert, TriangleAlert } from "lucide-react"

import type { SystemService } from "@/config/system-status"
import { cn } from "@/lib/utils"

type StatusBannerProps = { services: SystemService[] }

/** Sin equivalente en Figma — resumen tipo statuspage.io a partir de `SystemService[]`. */
export function StatusBanner({ services }: StatusBannerProps) {
  const interrupted = services.filter((s) => s.status === "interrumpido")
  const degraded = services.filter((s) => s.status === "degradado")

  if (interrupted.length > 0) {
    return (
      <Banner
        tone="error"
        icon={OctagonAlert}
        title="Interrupción activa"
        detail={`${interrupted.length} ${interrupted.length === 1 ? "sistema afectado" : "sistemas afectados"}`}
      />
    )
  }

  if (degraded.length > 0) {
    return (
      <Banner
        tone="warning"
        icon={TriangleAlert}
        title="Rendimiento degradado"
        detail={`${degraded.length} ${degraded.length === 1 ? "sistema" : "sistemas"} con latencia por encima de lo normal`}
      />
    )
  }

  return (
    <Banner
      tone="success"
      icon={CheckCircle2}
      title="Todos los sistemas operativos"
    />
  )
}

function Banner({
  tone,
  icon: Icon,
  title,
  detail,
}: {
  tone: "success" | "warning" | "error"
  icon: typeof CheckCircle2
  title: string
  detail?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-5 py-4 shadow-form-section",
        tone === "success" && "bg-success-bg text-success",
        tone === "warning" && "bg-warning-bg text-warning",
        tone === "error" && "bg-destructive-bg text-destructive"
      )}
    >
      <Icon className="size-5 shrink-0" />
      <div className="flex flex-col">
        <p className="text-sm font-semibold">{title}</p>
        {detail && <p className="text-xs opacity-90">{detail}</p>}
      </div>
    </div>
  )
}
