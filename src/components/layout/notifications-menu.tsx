"use client"

import {
  Bell,
  CheckCircle2,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { useNotifications } from "@/components/layout/notifications-context"
import { DECISION_REASON_LABEL } from "@/lib/approval-flow"
import { formatEventDate } from "@/lib/format"
import { markMyNotificationsRead } from "@/lib/notifications-actions"
import { cn } from "@/lib/utils"
import type { DecisionReason } from "@/types/domain"

type NotificationTone = "info" | "success" | "warning" | "error"

const TONE_STYLES: Record<NotificationTone, string> = {
  info: "bg-accent text-accent-foreground",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  error: "bg-destructive-bg text-destructive",
}

/**
 * Tono e ícono por tipo. Los tres tipos de hoy vienen de una decisión de
 * doble aprobación (`notificar_decision_aprobacion`), así que el tono es el
 * de la decisión: aprobada en verde, rechazada en rojo. Aquí sí codifica
 * información —el desenlace— y por eso no va en la gama del acento.
 */
const TYPE_STYLE: Record<string, { tone: NotificationTone; icon: LucideIcon }> =
  {
    aprobacion_concedida: { tone: "success", icon: CheckCircle2 },
    aprobacion_rechazada: { tone: "error", icon: XCircle },
    aprobacion_retirada: { tone: "warning", icon: Undo2 },
  }

/**
 * La campana del Topbar, con las notificaciones reales de quien está dentro.
 *
 * Antes eran cinco ejemplos escritos a mano en memoria: la campana enseñaba
 * cómo se vería si el sistema notificara algo, y el sistema no notificaba
 * nada. Ahora las escribe un trigger cuando alguien decide una doble
 * aprobación (20260907140000), así que quien pidió la firma se entera —que
 * es la mitad que faltaba de un flujo de dos personas.
 *
 * Los datos llegan por props desde `AppPage`, que es Server Component: la
 * campana no consulta por su cuenta porque se renderiza en cada pantalla y
 * cada consulta suya se pagaría en todas.
 */
export function NotificationsMenu({ className }: { className?: string }) {
  const snapshot = useNotifications()
  const items = snapshot?.items ?? []
  const unread = snapshot?.unread ?? 0
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function markAllAsRead() {
    startTransition(async () => {
      await markMyNotificationsRead()
      router.refresh()
    })
  }

  return (
    <Popover>
      <PopoverTrigger
        title="Notificaciones"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-lg" }),
          "rounded-full bg-background shadow-topbar-control",
          className
        )}
      >
        <span className="relative inline-flex">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] leading-none font-medium text-destructive-foreground ring-2 ring-background">
              {unread}
            </span>
          )}
        </span>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-96 gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            Notificaciones
          </p>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unread === 0 || pending}
            className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            {pending ? "Marcando…" : "Marcar todas como leídas"}
          </button>
        </div>
        <Separator />

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            No tienes notificaciones. Aquí llegan las decisiones sobre lo que
            mandaste a aprobar.
          </p>
        ) : (
          <div className="flex max-h-[360px] scrollbar-thin flex-col overflow-y-auto">
            {items.map((notification) => {
              const style = TYPE_STYLE[notification.tipo] ?? {
                tone: "info" as NotificationTone,
                icon: Bell,
              }
              const Icon = style.icon
              const motivo = notification.codigoMotivo
                ? (DECISION_REASON_LABEL[
                    notification.codigoMotivo as DecisionReason
                  ] ?? notification.codigoMotivo)
                : null

              const cuerpo = (
                <>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      TONE_STYLES[style.tone]
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] leading-[18px] font-medium text-foreground">
                        {notification.titulo}
                      </p>
                      {!notification.leida && (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
                      {notification.descripcion}
                    </p>
                    {/* El motivo y la nota son el «por qué» de la decisión.
                        Una notificación que solo dice «rechazada» obliga a
                        ir a buscar qué corregir. */}
                    {motivo && (
                      <p className="mt-1 text-[11px] leading-[14px] text-secondary-foreground">
                        Motivo: {motivo}
                        {notification.nota ? ` — «${notification.nota}»` : ""}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] leading-[14px] text-muted-foreground">
                      {formatEventDate(notification.creadoEn)}
                    </p>
                  </div>
                </>
              )

              return notification.href ? (
                <Link
                  key={notification.id}
                  href={notification.href}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
                    !notification.leida && "bg-accent/50"
                  )}
                >
                  {cuerpo}
                </Link>
              ) : (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3",
                    !notification.leida && "bg-accent/50"
                  )}
                >
                  {cuerpo}
                </div>
              )
            })}
          </div>
        )}

        <Separator />
        <div className="p-1.5">
          {/* `nativeButton={false}` es obligatorio al renderizar el
              Button como enlace: Base UI avisa (con razón) de que un
              elemento no-<button> pierde la semántica nativa si no se lo
              dices. Mismo patrón que `editor-bar.tsx`. */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            nativeButton={false}
            render={<Link href="/aprobaciones" />}
          >
            Ir a Aprobaciones
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
