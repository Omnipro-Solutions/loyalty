"use client"

import { ChevronRight, ShieldCheck } from "lucide-react"

import { MicrosoftLogo } from "@/components/icons/microsoft-logo"

import { startAzureOAuthRedirect } from "../lib/oauth"

/** Botones de SSO bajo el login por contraseña (Figma "SSO providers", 1145:4781). */
export function SsoProviderButtons({ samlEnabled }: { samlEnabled: boolean }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={() => void startAzureOAuthRedirect()}
        className="flex w-full items-center gap-3 rounded-[10px] border border-border bg-background py-2 pr-3.5 pl-3 text-left transition-colors hover:bg-muted"
      >
        <span className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-neutral-50 p-1">
          <MicrosoftLogo className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">
            Continuar con Microsoft
          </span>
          <span className="text-[11px] text-muted-foreground">
            Entra ID · etter.onmicrosoft.com
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <button
        type="button"
        disabled={!samlEnabled}
        title={
          samlEnabled
            ? undefined
            : "SAML 2.0 requiere el plan Supabase Pro — deshabilitado en este demo"
        }
        className="flex w-full items-center gap-3 rounded-[10px] border border-border bg-background py-2 pr-3.5 pl-3 text-left transition-colors hover:not-disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex shrink-0 items-center justify-center rounded-lg border border-border bg-neutral-50 p-1">
          <ShieldCheck className="size-4 text-muted-foreground" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">
            Continuar con SSO corporativo
          </span>
          <span className="text-[11px] text-muted-foreground">
            SAML 2.0 · Okta, Ping, Google Workspace
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  )
}
