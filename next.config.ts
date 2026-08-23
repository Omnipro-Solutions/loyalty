import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // `playwright.config.ts` apunta a 127.0.0.1 mientras `pnpm dev` sirve por
  // defecto en localhost — sin esto, Next 16 bloquea los chunks estáticos
  // por origen cruzado, la hidratación nunca termina, y un submit de
  // formulario cae al POST/GET nativo del navegador (ver el gotcha de
  // "password en la URL" documentado en memoria de sesión, Fase 3).
  allowedDevOrigins: ["127.0.0.1"],
}

export default nextConfig
