"use client"

import * as React from "react"

/**
 * Booleano persistido en localStorage. Usa `useSyncExternalStore` en vez de
 * `useEffect` + `setState` (ese patrón dispara "Avoid calling setState()
 * directly within an effect" en `eslint-plugin-react-hooks`) — necesita un
 * bus de listeners aparte porque el evento nativo `storage` no se dispara
 * en la misma pestaña que hizo el cambio, solo en las demás.
 */
export function useLocalStorageBoolean(key: string, fallback: boolean) {
  const listenersRef = React.useRef(new Set<() => void>())

  const subscribe = React.useCallback((onChange: () => void) => {
    const listeners = listenersRef.current
    listeners.add(onChange)
    window.addEventListener("storage", onChange)
    return () => {
      listeners.delete(onChange)
      window.removeEventListener("storage", onChange)
    }
  }, [])

  const getSnapshot = React.useCallback(() => {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : raw === "1"
  }, [key, fallback])

  const getServerSnapshot = React.useCallback(() => fallback, [fallback])

  const value = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const setValue = React.useCallback(
    (next: boolean) => {
      window.localStorage.setItem(key, next ? "1" : "0")
      listenersRef.current.forEach((listener) => listener())
    },
    [key]
  )

  return [value, setValue] as const
}
