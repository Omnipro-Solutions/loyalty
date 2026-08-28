import {
  Receipt,
  Repeat,
  Target,
  TicketPercent,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"

import {
  KpiDenseCard as BaseKpiDenseCard,
  type KpiDenseTone,
} from "@/components/data/kpi-dense-card"

const ICONS: Record<string, LucideIcon> = {
  users: Users,
  "user-plus": UserPlus,
  repeat: Repeat,
  receipt: Receipt,
  "ticket-percent": TicketPercent,
  target: Target,
}

type KpiDenseCardProps = {
  label: string
  icon: keyof typeof ICONS
  value: string
  /** Ausente cuando no hay periodo de comparación con datos — la pill se muestra neutral. */
  deltaPct?: number
  deltaLabel?: string
  caption: string
  sparkline?: number[]
  tone: KpiDenseTone
}

/**
 * Adaptador del dashboard denso sobre `components/data/kpi-dense-card`. Lo
 * único propio es el catálogo de iconos por CLAVE: los KPI de esta pantalla
 * vienen de `lib/queries.ts` como datos serializables, y un componente de
 * React no cruza la frontera servidor→cliente. La tarjeta compartida recibe
 * el icono ya resuelto.
 */
export function KpiDenseCard({ icon, ...props }: KpiDenseCardProps) {
  return <BaseKpiDenseCard icon={ICONS[icon]} {...props} />
}
