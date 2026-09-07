"use client"

import { createContext, useContext } from "react"

type MobileNavContextValue = {
  /** `true` while the off-canvas nav drawer is open (only reachable below `lg`). */
  open: boolean
  setOpen: (open: boolean) => void
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export const MobileNavProvider = MobileNavContext.Provider

/**
 * Lets `AppTopbar` open the off-canvas nav that `AppShell` owns. The topbar
 * is rendered per page (through `AppPage`), not by the shell, so the open
 * state has to travel through context instead of props.
 *
 * Returns `null` outside a shell (the `(auth)` screens, `/ds`) so the
 * topbar simply doesn't render the trigger there.
 */
export function useMobileNav() {
  return useContext(MobileNavContext)
}
