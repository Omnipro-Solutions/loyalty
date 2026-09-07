"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

/**
 * Lo que se espera a que la persona termine de escribir. 300 ms es el valor
 * que ya usaban las seis barras de filtros por su cuenta; aquí queda en un
 * solo sitio.
 */
const DEBOUNCE_MS = 300

/**
 * Un buscador atado a un parámetro de la URL, con su estado de carga.
 *
 * Antes esto estaba copiado en ocho componentes: el mismo `useState`, el
 * mismo `setTimeout` de 300 ms, el mismo `router.push` borrando `page`. Y
 * ninguno decía nada mientras la consulta corría — se escribía, la tabla se
 * quedaba quieta un rato y luego cambiaba de golpe, sin que nada indicara
 * que el sistema estaba haciendo algo. En una demo eso se lee como que el
 * buscador no funciona.
 *
 * `loading` cubre las DOS esperas, y las dos son reales, no simuladas:
 *
 *   1. El debounce — la persona ya escribió, la consulta todavía no salió.
 *   2. La navegación — `router.push` dentro de `startTransition`, así que
 *      `isPending` dura hasta que el Server Component vuelve con los datos.
 *
 * Empezar en (1) y no en (2) es lo que hace que el indicador se vea: contra
 * una base rápida el viaje al servidor es de decenas de milisegundos y
 * aparecería como un parpadeo. Sumado al debounce, el indicador vive en
 * pantalla unos 400 ms — el tiempo que de verdad tarda desde la última
 * tecla hasta la fila nueva.
 *
 * `page` se borra en cada cambio a propósito: los resultados de una
 * búsqueda nueva empiezan en la página 1, no en la 4 en la que estabas.
 */
export function useSearchParam(key = "q") {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Lo que la URL ya tiene, que es lo que la tabla de abajo está mostrando.
  const committed = searchParams.get(key) ?? ""
  const [value, setValue] = useState(committed)

  useEffect(() => {
    // Se lee `window.location` y no `searchParams` para no re-armar el
    // temporizador cada vez que cambia OTRO filtro de la misma barra.
    const current = new URLSearchParams(window.location.search)
    if ((current.get(key) ?? "") === value) return

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete("page")
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [value, key, pathname, router])

  return {
    value,
    setValue,
    /**
     * `true` desde la tecla hasta que llegan los datos. `value !== committed`
     * cubre el debounce; `isPending`, el viaje al servidor. Si alguien vuelve
     * a escribir lo que ya estaba en la URL, las dos son falsas y no se
     * enciende nada — no hubo búsqueda.
     */
    loading: isPending || value !== committed,
  }
}
