import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

// Next.js 16 renombró `middleware.ts` → `proxy.ts` (export `proxy`, runtime
// nodejs fijo, sin soporte edge) — ver AGENTS.md / CLAUDE.md. Con `src/app`,
// el archivo va en `src/proxy.ts` (mismo nivel que `app`), no en la raíz del
// proyecto — ver node_modules/next/dist/docs/.../file-conventions/proxy.md.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
