import type { IntegrationAuthType } from "@/types/domain"

/**
 * `Integration.method` en el catálogo (`src/config/integrations-catalog.ts`)
 * es texto libre para el panel de detalle ("API REST... · Autenticación
 * OAuth 2.0") — esta es la lectura estructurada del mismo dato, una vez por
 * integración, para decidir qué formulario de credenciales renderizar. El
 * mismo `id` en orígenes y destinos siempre usa el mismo método: es la
 * cuenta del proveedor, no la dirección del flujo, la que define cómo se
 * autentica.
 */
const AUTH_TYPE_BY_INTEGRATION_ID: Record<string, IntegrationAuthType> = {
  ajo: "oauth2",
  cjo: "oauth2",
  braze: "api_key",
  "power-bi": "oauth2",
  tableau: "token_personal",
  looker: "oauth2",
  shopify: "oauth2",
  vtex: "app_key_token",
  magento: "token_integracion",
  square: "oauth2",
  "oracle-micros": "certificado",
  "sap-checkout": "usuario_tecnico",
  "adobe-rtcdp": "oauth2",
  "salesforce-cdp": "oauth2",
}

/**
 * Sin fallback silencioso a propósito: una integración nueva en el catálogo
 * sin fila acá mostraría el formulario de credenciales equivocado sin
 * ningún aviso — mejor un error explícito al abrir la página que forzar a
 * agregarla aquí.
 */
export function authTypeForIntegration(
  integrationId: string
): IntegrationAuthType {
  const authType = AUTH_TYPE_BY_INTEGRATION_ID[integrationId]
  if (!authType) {
    throw new Error(
      `Sin tipo de autenticación mapeado para "${integrationId}" — agrégalo a AUTH_TYPE_BY_INTEGRATION_ID en lib/auth-type.ts.`
    )
  }
  return authType
}
