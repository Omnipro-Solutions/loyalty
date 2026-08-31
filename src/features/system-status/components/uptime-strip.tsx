import type { UptimeDay } from "@/config/system-status"
import { SYSTEM_STATUS_DOT } from "@/config/system-status"
import { formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type UptimeStripProps = { history: UptimeDay[] }

/**
 * Franja de barritas diarias tipo statuspage.io — CSS grid en vez de
 * recharts, que es como esas páginas reales lo hacen (no es una gráfica de
 * ejes, es una tira de estado día a día).
 */
export function UptimeStrip({ history }: UptimeStripProps) {
  return (
    <div className="flex w-full items-end gap-[2px]">
      {history.map((day) => (
        <span
          key={day.date}
          title={`${formatShortDate(day.date)} · ${day.percent}%`}
          className={cn(
            "h-6 min-w-[2px] flex-1 rounded-[1px]",
            SYSTEM_STATUS_DOT[day.status]
          )}
        />
      ))}
    </div>
  )
}
