"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

/**
 * Toggle claro/oscuro, junto al botón de notificaciones del topbar. El icono
 * se decide con la variante `dark:` de Tailwind (lee la clase que
 * `next-themes` aplica a `<html>` antes de hidratar) en vez de estado de
 * React, para no depender de un "mounted" flag que dispararía
 * `react-hooks/set-state-in-effect`.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      title="Cambiar tema"
      className="rounded-full bg-background shadow-topbar-control"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  )
}
