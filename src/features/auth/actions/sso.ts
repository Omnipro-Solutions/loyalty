"use server"

import { actionClient } from "@/lib/safe-action"
import { createClient } from "@/lib/supabase/server"
import type { TenantIdp } from "@/types/domain"

import { ssoLookupSchema } from "../schemas"

/**
 * Descubrimiento de IdP por dominio de correo (01.3) — necesita correr
 * SIN sesión (el usuario todavía no inició sesión), así que no puede pasar
 * por RLS normal (`organizations_select_own` exige `current_org_id()`, que
 * depende de `auth.uid()`). Por eso llama a la función
 * `lookup_org_idp_by_domain` (SECURITY DEFINER, concedida a `anon`) añadida
 * en supabase/migrations/..._sso_domain_lookup.sql — expone solo
 * nombre + tipo de IdP para un dominio, nada sensible.
 */
export const lookupSsoProviderAction = actionClient
  .inputSchema(ssoLookupSchema)
  .action(async ({ parsedInput }) => {
    const domain = parsedInput.email.split("@")[1]?.toLowerCase()
    if (!domain) return { found: false as const }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("lookup_org_idp_by_domain", {
      p_dominio: domain,
    })
    const org = data?.[0]

    if (error || !org || !org.tenant_idp) {
      return { found: false as const }
    }

    return {
      found: true as const,
      name: org.nombre,
      tenantIdp: org.tenant_idp as TenantIdp,
      domain,
    }
  })
