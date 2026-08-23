import { createClient } from "@/lib/supabase/client"

/**
 * Dispara el redirect real a Microsoft Entra ID (OAuth, gratis en cualquier
 * plan de Supabase). Requiere `SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID`/
 * `_SECRET` configurados en el proyecto de Supabase — hoy vacíos en
 * `.env.local`, así que esto redirige pero Supabase rechaza el intercambio
 * hasta que el usuario dé de alta la app registration en Azure AD.
 */
export async function startAzureOAuthRedirect() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: "email",
    },
  })
}
