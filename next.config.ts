import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // `playwright.config.ts` apunta a 127.0.0.1 mientras `pnpm dev` sirve por
  // defecto en localhost — sin esto, Next 16 bloquea los chunks estáticos
  // por origen cruzado, la hidratación nunca termina, y un submit de
  // formulario cae al POST/GET nativo del navegador (ver el gotcha de
  // "password en la URL" documentado en memoria de sesión, Fase 3).
  allowedDevOrigins: ["127.0.0.1"],
  // `recharts`/`lucide-react`/`date-fns` ya vienen en la lista por defecto de
  // Next 16 — estas son las que exponen imports con nombre desde su raíz y
  // no están en esa lista todavía.
  experimental: {
    optimizePackageImports: [
      "@tanstack/react-table",
      "react-querybuilder",
      "cmdk",
      "react-day-picker",
      "@base-ui/react",
    ],
  },
}

export default nextConfig
