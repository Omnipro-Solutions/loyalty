"use client"

import { useState } from "react"
import {
  Bell,
  Megaphone,
  PlugZap,
  Trophy,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { formatEventDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type NotificationTone = "info" | "success" | "warning" | "error"

type Notification = {
  id: string
  tone: NotificationTone
  icon: LucideIcon
  title: string
  description: string
  date: Date
  read: boolean
}

const TONE_STYLES: Record<NotificationTone, string> = {
  info: "bg-accent text-accent-foreground",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  error: "bg-destructive-bg text-destructive",
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    tone: "info",
    icon: Megaphone,
    title: "Nueva promoción publicada",
    description:
      "El descuento 2x1 en Bebidas ya está activo en todas las tiendas.",
    date: new Date("2026-08-23T09:14:00"),
    read: false,
  },
  {
    id: "2",
    tone: "error",
    icon: PlugZap,
    title: "Integración desconectada",
    description:
      "La conexión con Shopify perdió autenticación. Revisa las credenciales.",
    date: new Date("2026-08-23T08:32:00"),
    read: false,
  },
  {
    id: "3",
    tone: "success",
    icon: Trophy,
    title: "Meta de canjes alcanzada",
    description: "La tienda Etter Chapinero superó los 500 canjes este mes.",
    date: new Date("2026-08-22T17:41:00"),
    read: true,
  },
  {
    id: "4",
    tone: "warning",
    icon: Workflow,
    title: "Journey pausado",
    description:
      '"Bienvenida VIP" se pausó por un error en el paso de envío de correo.',
    date: new Date("2026-08-21T11:05:00"),
    read: true,
  },
  {
    id: "5",
    tone: "info",
    icon: Users,
    title: "Audiencia recalculada",
    description: '"Clientes inactivos 90 días" ahora tiene 1,204 miembros.',
    date: new Date("2026-08-19T09:40:00"),
    read: true,
  },
]

/**
 * Ejemplo visual de cómo se verían las notificaciones en la campana del
 * topbar. Sin nodo propio en el Figma — datos de ejemplo en memoria, sigue
 * los tokens y el patrón de `user-menu.tsx`.
 */
export function NotificationsMenu({ className }: { className?: string }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const unreadCount = notifications.filter((n) => !n.read).length

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
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
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] leading-none font-medium text-destructive-foreground ring-2 ring-background">
              {unreadCount}
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
            disabled={unreadCount === 0}
            className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            Marcar todas como leídas
          </button>
        </div>
        <Separator />

        <div className="flex max-h-[360px] flex-col overflow-y-auto">
          {notifications.map((notification) => {
            const Icon = notification.icon
            return (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3",
                  !notification.read && "bg-accent/50"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    TONE_STYLES[notification.tone]
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] leading-[18px] font-medium text-foreground">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">
                    {notification.description}
                  </p>
                  <p className="mt-1 text-[11px] leading-[14px] text-muted-foreground">
                    {formatEventDate(notification.date)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <Separator />
        <div className="p-1.5">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Ver todas las notificaciones
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
