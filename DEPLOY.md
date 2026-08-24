# Despliegue a Vercel — Loyalty Portal

Guía paso a paso para desplegar este proyecto (Next.js 16 + Supabase) en
Vercel. Asume que ya existe un proyecto Supabase remoto (el que usa
`.env.local` en local) y que el repo vive en
`github.com/Omnipro-Solutions/loyalty`.

---

## 0. Pre-requisitos

- [ ] Cuenta en [vercel.com](https://vercel.com) con acceso a la org/team
      donde se va a desplegar.
- [ ] Acceso de admin al repo `Omnipro-Solutions/loyalty` (para que Vercel
      pueda instalar el GitHub App o para hacer login con `vercel login` +
      `vercel link`).
- [ ] Los tres secretos de Supabase (Project Settings → API en
      [supabase.com/dashboard](https://supabase.com/dashboard)): - `NEXT_PUBLIC_SUPABASE_URL` - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca con prefijo `NEXT_PUBLIC_`)
- [ ] `pnpm check` y `pnpm build` pasan limpios en local antes de desplegar
      (regla del `CLAUDE.md` del repo).

---

## 1. Verificar el build en local

```bash
pnpm install
pnpm check   # typecheck + lint + format:check
pnpm build   # build de producción con Turbopack
```

Si algo falla aquí, falla igual en Vercel — resuélvelo antes de continuar.

---

## 2. Crear el proyecto en Vercel

### Opción A — Dashboard (recomendada la primera vez)

1. Entra a [vercel.com/new](https://vercel.com/new).
2. Importa el repo `Omnipro-Solutions/loyalty` (autoriza el GitHub App de
   Vercel si es la primera vez que conecta con esa org).
3. En **Configure Project**:
   - **Framework Preset:** Next.js (detectado automático).
   - **Root Directory:** `.` (es una app única, sin monorepo).
   - **Build Command:** `pnpm build` (default, no lo cambies).
   - **Output Directory:** default (`.next`).
   - **Install Command:** default — Vercel detecta `pnpm-lock.yaml` y usa
     pnpm automáticamente. Si no lo detecta, fuerza
     `pnpm install --frozen-lockfile`.
4. **No hagas deploy todavía** — primero configura las variables de entorno
   (paso 3).

### Opción B — CLI

```bash
pnpm dlx vercel login
pnpm dlx vercel link   # conecta esta carpeta con un proyecto Vercel (nuevo o existente)
```

---

## 3. Variables de entorno

En **Project Settings → Environment Variables** (o vía CLI, ver abajo),
agrega — para **Production**, **Preview** y **Development** según aplique:

| Variable                                 | Valor                                | Exponer al cliente          |
| ---------------------------------------- | ------------------------------------ | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`               | URL del proyecto Supabase            | Sí (prefijo `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`          | anon key del proyecto                | Sí                          |
| `SUPABASE_SERVICE_ROLE_KEY`              | service role key                     | **No** — solo server        |
| `SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID` | App registration de Entra ID         | No (si usas SSO Microsoft)  |
| `SUPABASE_AUTH_EXTERNAL_AZURE_SECRET`    | secret de esa app registration       | No                          |
| `SSO_SAML_ENABLED`                       | `false` (hasta subir a Supabase Pro) | No                          |

> Referencia completa de variables: `.env.local.example` en la raíz del repo.

Con la CLI, por variable:

```bash
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_URL production
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
pnpm dlx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# repite para preview/development si necesitas esos entornos
```

⚠️ **Nunca** le pongas el prefijo `NEXT_PUBLIC_` a `SUPABASE_SERVICE_ROLE_KEY`
— quedaría expuesta al bundle del cliente.

---

## 4. Actualizar la config de Supabase Auth con la URL real de Vercel

`supabase/config.toml` (local) tiene `site_url` y `additional_redirect_urls`
apuntando a `127.0.0.1:3000` — eso es solo para desarrollo local y no se
aplica al proyecto remoto. En el **dashboard del proyecto Supabase remoto**
(Authentication → URL Configuration):

1. **Site URL:** pon la URL de producción de Vercel
   (`https://<tu-proyecto>.vercel.app` o el dominio custom del paso 6). Los
   correos de recuperación de contraseña y de invitación (paso 4.1) usan
   `{{ .SiteURL }}` para construir el enlace — si esto queda mal, esos dos
   flujos rompen en producción aunque el login normal funcione bien.
2. **Redirect URLs:** agrega:
   - `https://<tu-proyecto>.vercel.app/**`
   - Si usarás Preview Deployments con auth, también
     `https://*-<tu-org>.vercel.app/**` (o los previews específicos que
     necesites probar).
3. Si usas SSO con Microsoft Entra ID (`SUPABASE_AUTH_EXTERNAL_AZURE_*`),
   actualiza también el **Redirect URI** en el App registration de Azure
   (portal.azure.com) para que incluya la URL de callback de Supabase con el
   dominio de producción.

### 4.1 Plantillas de correo — recuperación de contraseña y activación de cuenta

El plan **Free** de Supabase Auth **no permite personalizar las plantillas
de correo** (invite/recovery) mientras se use el mailer incluido — al
intentarlo (`supabase config push` o pegar HTML custom en el dashboard) la
API responde `Email template modification is not available for free tier
projects using the default email provider`. Por eso el repo ya no usa
`supabase/templates/invite.html` / `recovery.html` en `config.toml` (quedan
ahí solo como referencia, comentados, para cuando se configure SMTP propio
— ver 4.2).

En su lugar, invite y recovery usan el **flujo implícito por defecto** de
Supabase (`{{ .ConfirmationURL }}`): el enlace del correo verifica el token
en el propio `/verify` de Supabase y redirige con los tokens de sesión en
el fragmento de la URL (`#access_token=...`). Como esta app solo maneja
sesión por cookies (`@supabase/ssr`), ese fragmento lo captura un
componente cliente en `/verificando-enlace`
(`src/features/auth/components/link-callback-card.tsx`), que llama a
`establishSessionAction` para fijar la sesión de cookies y de ahí manda a
`/activar-cuenta` o `/restablecer-contrasena` según el `type` que trae el
fragmento. `inviteUserByEmail`/`resetPasswordForEmail` pasan
`redirectTo: {SiteURL}/verificando-enlace` explícitamente (ver
`src/features/team/actions/invitations.ts` y
`src/features/auth/actions/password-reset.ts`) — por eso sigue siendo
igual de importante que `Site URL` y `Redirect URLs` (paso 4) estén bien
configurados: si `/verificando-enlace` no está permitido en el allow-list,
Supabase ignora el `redirectTo` y cae de vuelta a `Site URL` sin el
fragmento útil.

Si en algún momento se configura SMTP propio (4.2) o se sube de plan, se
pueden reactivar `[auth.email.template.invite]` / `[auth.email.template.recovery]`
en `config.toml` y volver al flujo por `token_hash` (más simple,
server-side) — el código de ese flujo anterior puede recuperarse del
historial de git si hace falta.

### 4.2 SMTP en producción

El mailer incluido de Supabase (plan Free) está pensado solo para pruebas
— rate limit muy bajo (`email_sent` en `supabase/config.toml`, 2/hora en
local; el remoto tiene un tope similar). Con tráfico real de invitaciones o
recuperación de contraseña, configura un **SMTP propio**: Dashboard →
Project Settings → Authentication → SMTP Settings (Resend, SendGrid,
Postmark, etc.). Sin esto, en producción real vas a ver correos que
tardan o simplemente no llegan una vez se supera el límite.

---

## 5. Deploy

### Dashboard

Click **Deploy** una vez las env vars están cargadas. Vercel construye con
`pnpm build` y publica.

### CLI

```bash
pnpm dlx vercel        # deploy de preview
pnpm dlx vercel --prod # deploy a producción
```

---

## 6. Dominio custom (opcional)

1. **Project Settings → Domains** → agrega el dominio.
2. Configura los DNS records que Vercel indique (`CNAME` o `A`) en tu
   proveedor de DNS.
3. Repite el paso 4 (Site URL / Redirect URLs en Supabase) con el dominio
   final una vez esté verificado.

---

## 7. Verificación post-deploy

- [ ] Login normal (email/password) funciona end-to-end.
- [ ] Si aplica, login SSO con Microsoft Entra ID redirige correctamente
      (revisa el paso 4).
- [ ] **Recuperar contraseña:** "¿Olvidaste tu contraseña?" en `/login` →
      llega el correo → el enlace aterriza en `/restablecer-contrasena` con
      sesión ya iniciada (no en `/login`) → guardar la nueva contraseña deja
      entrar con ella.
- [ ] **Activar cuenta:** invitar a alguien desde Ajustes → Equipo → llega
      el correo de invitación → el enlace aterriza en `/activar-cuenta` →
      al fijar contraseña, el perfil creado tiene el `role_id`/`tienda_id`
      de la invitación (no cae al rol "Analista" por defecto).
- [ ] Las rutas protegidas por `src/proxy.ts` (el ex-`middleware.ts` de Next 16) redirigen sin sesión — confirma que el matcher no está bloqueando
      nada inesperado en producción.
- [ ] RLS: prueba con un usuario real que solo vea datos de su `org_id`
      (aislamiento multi-tenant).
- [ ] Revisa **Deployments → Functions/Logs** en Vercel por errores de
      runtime (recuerda: `proxy.ts` corre en runtime `nodejs`, no `edge`).

---

## 8. CI/CD (referencia)

Por defecto, cada push a `production` genera un deploy de producción y cada
PR genera un Preview Deployment automático (comportamiento estándar de la
integración GitHub de Vercel, sin config adicional). Si quieres bloquear el
deploy hasta que pase CI, configúralo en **Project Settings → Git** o añade
un `vercel.json` con `"ignoreCommand"` que corra `pnpm check`.

---

## Troubleshooting rápido

| Síntoma                                                                                                               | Causa probable                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build falla en Vercel pero pasa en local                                                                              | Variable de entorno faltante en Vercel, o versión de Node distinta (el repo requiere Node ≥ 20.9 — fija `"engines"` en `package.json` o el Node version en Project Settings si Vercel usa una versión distinta) |
| Login funciona en local pero no en producción                                                                         | `site_url` / `additional_redirect_urls` de Supabase no actualizados con el dominio de Vercel (paso 4)                                                                                                           |
| `SUPABASE_SERVICE_ROLE_KEY` parece no tener efecto                                                                    | Revisa que no tenga prefijo `NEXT_PUBLIC_` y que esté marcada solo para Server (nunca se debe exponer al bundle)                                                                                                |
| 500 en rutas con `proxy.ts`                                                                                           | Confirma que el proyecto no está forzando runtime `edge` en algún segmento — Next 16 requiere `nodejs` para `proxy.ts` en este repo                                                                             |
| El correo llega pero el enlace deja al usuario en `/login` en vez de en `/activar-cuenta` o `/restablecer-contrasena` | `Site URL` / `Redirect URLs` remotos (paso 4) no incluyen el dominio real — Supabase descarta el `redirectTo` a `/verificando-enlace` y el fragmento con los tokens nunca llega ahí                             |
| El correo de recuperación/invitación nunca llega                                                                      | `site_url` mal configurado, o se superó el rate limit del mailer incluido de Supabase (paso 4.2) — configura SMTP propio                                                                                        |
| Invitación aceptada pero el perfil queda con el rol "Analista" en vez del invitado                                    | Se llamó a `inviteUserByEmail` antes de insertar la fila en `invitaciones`, o esa invitación ya no estaba `pendiente` — revisa el orden en `src/features/team/actions/invitations.ts`                           |
