# CLAUDE.md — Loyalty Portal

Guía para trabajar en este repositorio. Léela antes de tocar código.

> **Next.js 16:** este proyecto usa Next 16, con cambios respecto a versiones
> anteriores — el más importante para este repo: **`middleware.ts` fue
> renombrado a `proxy.ts`** (export `proxy`, no `middleware`; runtime fijo en
> `nodejs`, sin soporte `edge`). Antes de escribir código de Next, consulta
> los docs incluidos en `node_modules/next/dist/docs/` (ver también
> `AGENTS.md`, que un hook de `next dev` mantiene actualizado — no lo borres).

Demo de un sistema de loyalty (**Loyalty System · By Omni**) construida
pixel-perfect contra el Figma "Loyalty-Desing"
(`KxtI6mzVfDqGisGhC9VAf5`). Ver `.claude/plans/` (o pedir al usuario) por el
plan de fases completo. Tenant de demo: **Etteer · Omni Retail Group**
(`dominio_correo = etteer.com`).

---

## 1. Stack y versiones

App única de Next.js (sin monorepo).

| Capa            | Herramienta                                                     | Versión                        |
| --------------- | --------------------------------------------------------------- | ------------------------------ |
| Runtime         | Node                                                            | ≥ 20.9                         |
| Package manager | pnpm                                                            | 11.x                           |
| Framework       | Next.js (App Router, Turbopack por defecto)                     | 16.3.2                         |
| UI runtime      | React / React DOM                                               | 19.2.8                         |
| Lenguaje        | TypeScript                                                      | 5.9.3                          |
| Estilos         | Tailwind CSS (CSS-first, sin `tailwind.config.js`)              | 4.3.3                          |
| Componentes     | shadcn (`base-vega`) sobre `@base-ui/react`                     | shadcn 4.19.0 · base-ui 1.7.0  |
| Utilidades UI   | class-variance-authority · tailwind-merge · clsx · lucide-react | 0.7.1 · 3.6.0 · 2.1.1 · 1.33.0 |
| Backend         | Supabase (Postgres + Auth + RLS + Storage), plan **Free**       | CLI 2.115.0                    |
| Validación      | zod                                                             | 4.x                            |
| Formularios     | react-hook-form + @hookform/resolvers                           | 7.x · 5.x                      |
| Server Actions  | next-safe-action                                                | 8.x                            |
| Canvas builder  | @xyflow/react                                                   | 12.x (Fase 4)                  |
| Lint            | ESLint · eslint-plugin-boundaries                               | 9.x · 7.x                      |
| Formato         | Prettier · prettier-plugin-tailwindcss                          | 3.9.x · 0.8.x                  |
| Git hooks       | husky · lint-staged · commitlint                                | 9.x · 17.x · 21.x              |

### Árbol del proyecto (`src`)

```
src/
├── app/
│   ├── (auth)/              # route group — login, 2FA, SSO (módulo 1)
│   ├── (app)/                # route group — shell autenticado
│   │   └── journeys/         # Loyalty Builder (módulo 2)
│   ├── ds/                    # harness de verificación pixel-perfect
│   ├── layout.tsx
│   └── globals.css           # única fuente de tokens (@theme inline)
├── features/                 # módulos de dominio (aislados entre sí)
│   ├── auth/
│   └── builder/{blocks,canvas,inspector,engine,validation}
├── components/
│   ├── ui/                   # primitivos shadcn — no editar a mano
│   ├── layout/                # AppSidebar, SidebarRail, AppTopbar, NavItem…
│   ├── form/ data/ filters/ feedback/
├── lib/
│   ├── supabase/{client,server,proxy}.ts
│   ├── permissions.ts        # can(rol, accion, recurso), puro
│   └── format.ts             # COP, %, fechas es-CO
├── config/                    # navegación, catálogo de bloques del builder
├── types/{database.types.ts, domain.ts}
└── hooks/
```

Los primitivos de shadcn viven en `src/components/ui` y están **ignorados
por ESLint por completo** (ver `eslint.config.mjs`) — no los edites a mano,
usa `pnpm dlx shadcn@latest add <componente>` (preset `base-vega` ya
configurado en `components.json`).

---

## 2. Arquitectura y reglas de dependencia

Arquitectura por capas: cada capa solo importa **hacia abajo**, y las
`features` están **aisladas entre sí**. Se aplica de forma automática con
`eslint-plugin-boundaries` (falla el lint si se viola) — ver
`eslint.config.mjs`.

| Capa (`from`) | Puede importar de                                            |
| ------------- | ------------------------------------------------------------ |
| `app`         | features, components, hooks, lib, config, types              |
| `features`    | **su propia feature**, components, hooks, lib, config, types |
| `components`  | components, hooks, lib, config, types                        |
| `hooks`       | hooks, lib, config, types                                    |
| `lib`         | lib, config, types                                           |
| `config`      | config, types                                                |
| `types`       | types                                                        |

- Paquetes **externos** (`next`, `react`, `@supabase/*`, `@xyflow/react`, …)
  están permitidos en todas las capas.
- **Prohibido** importar de una feature a otra feature distinta
  (`features/auth` nunca importa de `features/builder` ni viceversa). Si dos
  features comparten algo, ese algo sube a `components`/`lib`/`config`/`types`.
- Nada importa "hacia arriba".

---

## 3. Convenciones de naming

- **Ficheros y carpetas:** `kebab-case`. Route groups entre paréntesis:
  `(auth)`, `(app)`.
- **Componentes React:** export en `PascalCase`; el fichero en `kebab-case`.
- **Hooks:** `useAlgo` (camelCase); fichero `use-algo.ts`.
- **Conjuntos cerrados:** union types derivados de una tupla `as const`,
  **nunca `enum`** (ver `src/types/domain.ts`):

  ```ts
  export const ROLES = ["admin", "gestor", "aprobador", "lector"] as const
  export type Rol = (typeof ROLES)[number]
  ```

- **Constantes de esas tuplas:** `UPPER_SNAKE_CASE` (`ROLES`, `TIER_NOMBRES`).
- **Valores de dominio (miembros del union):** `snake_case` en minúscula y en
  español (`en_progreso`, `descuento_porcentaje`). Cada tupla TS debe reflejar
  exactamente el `check` de la columna equivalente en `supabase/migrations/`.
- **Alias de import:** `@/*` → `src/*`. No uses rutas relativas largas.
- **SQL:** tablas y columnas en `snake_case`; sin `enum` de Postgres — usar
  `text` + `check` (misma razón: evolucionar un valor no debe requerir
  `ALTER TYPE`).

---

## 4. Frontera server / client

App Router: **todo es Server Component por defecto.**

- `"use client"` **solo** en el componente hoja que lo necesite. No lo pongas
  en layouts/páginas "por si acaso".
- Los **providers** de cliente viven en `src/components/providers/`.
- El **data-access y los secretos** se quedan en el servidor
  (`lib/supabase/server.ts`, Server Components, Server Actions). Nunca
  importes `lib/supabase/server.ts` desde un Client Component.
- A través de la frontera solo pasan **props serializables**.
- APIs de Next 16 que son async siempre: `cookies()`, `headers()`,
  `params`, `searchParams`, `draftMode()`. Nunca las trates como síncronas.

---

## 5. Política de tokens y datos

### 5.1 Design tokens (estilos)

- **Única fuente de verdad:** `src/app/globals.css`. Variables CSS en `:root`
  / `.dark`, mapeadas a Tailwind con `@theme inline`. Todas verificadas
  contra el Figma vía `get_variable_defs` — ver comentario al inicio del
  archivo.
- En los componentes usa **clases semánticas de Tailwind**
  (`bg-background`, `text-foreground`, `bg-primary`, `bg-brand-subtle`,
  `text-success`, `bg-data-coral`, …). **Nunca** hardcodees colores (`#fff`,
  `oklch(...)`, `text-[…]`) en un componente — si el color no existe como
  token, añádelo primero a `globals.css` (en `:root`, `.dark` y
  `@theme inline`).
- El Figma no define paleta dark. `.dark` existe y es coherente (no solo
  grises) pero **no está verificada visualmente** — la app se muestra solo en
  claro hasta que alguien la audite.
- Componer clases: `cn(...)` (merge, `src/lib/utils.ts`) y `cva(...)`
  (variantes). Ambas están en `tailwindFunctions` de Prettier.

### 5.2 Base de datos y RLS

- **Aislamiento multi-tenant por `org_id`**, aplicado con Row Level Security
  en cada tabla (`supabase/migrations/..._rls.sql`). El helper
  `current_org_id()` resuelve la organización del usuario autenticado.
- **Importante:** las tablas nuevas ya NO se auto-exponen a los roles de la
  Data API sin un `GRANT` explícito (comportamiento reciente de Supabase,
  ver comentario de `auto_expose_new_tables` en `supabase/config.toml`). Toda
  migración que cree una tabla necesita su bloque de `GRANT` correspondiente
  además de sus políticas RLS, o Postgres rechaza el acceso antes de
  evaluarlas.
- **Autorización fina por rol** (quién puede publicar, aprobar, etc.) vive en
  la función pura `can(rol, accion, recurso)` de `src/lib/permissions.ts` —
  debe mantenerse equivalente a la tabla `role_permissions` (sembrada en
  `supabase/seed.sql`, pensada para la UI de 09.2).
- **MFA:** "Basic MFA" (TOTP vía app authenticator) está incluido en el plan
  Free de Supabase — verificado contra supabase.com/pricing. Solo "Advanced
  MFA - Phone" (SMS) es un add-on de pago; por eso el método de respaldo usa
  **backup codes** (`mfa_backup_codes`) en vez de SMS.
- **SSO:** Microsoft Entra ID funciona por **OAuth**, gratis en cualquier
  plan. **SAML 2.0** (Okta, Ping, Google Workspace) requiere Supabase Pro —
  las pantallas 01.3-01.5 están completas pero el redirect real a SAML queda
  detrás de `SSO_SAML_ENABLED` (`.env.local`) hasta que el proyecto suba de
  plan.
- **Tipos:** `src/types/database.types.ts` está escrito a mano (no hay
  Docker ni proyecto Supabase enlazado en este entorno). En cuanto se enlace
  un proyecto real, reemplazarlo con
  `pnpm exec supabase gen types typescript --linked > src/types/database.types.ts`.
- Los tokens de sesión y `SUPABASE_SERVICE_ROLE_KEY` **no** se exponen al
  cliente: sin prefijo `NEXT_PUBLIC_`, solo en servidor.

---

## 6. Comandos del proyecto

| Comando             | Qué hace                                              |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo (Turbopack)                    |
| `pnpm build`        | Build de producción                                   |
| `pnpm start`        | Sirve el build (depende de `build`)                   |
| `pnpm lint`         | ESLint (falla ante errores)                           |
| `pnpm lint:fix`     | ESLint con `--fix`                                    |
| `pnpm format`       | Prettier `--write`                                    |
| `pnpm format:check` | Prettier `--check` (usado en CI)                      |
| `pnpm typecheck`    | `tsc --noEmit`                                        |
| `pnpm check`        | `typecheck` + `lint` + `format:check` (gate local)    |
| `pnpm test`         | Vitest (lógica pura: `builder/engine`, `permissions`) |
| `pnpm test:e2e`     | Playwright (incluye el bucle pixel-perfect)           |

Antes de dar por terminado un cambio: **`pnpm check` y `pnpm build` deben
pasar limpios.**

### Commits (Conventional Commits)

`commitlint` valida cada mensaje (hook `commit-msg`); `lint-staged` corre
ESLint + Prettier sobre lo staged (hook `pre-commit`). Formato:
`tipo(scope): descripción`. `scope` debe ser uno de los definidos en
`commitlint.config.mjs` (secciones del Figma + transversales).

---

## 7. Verificación pixel-perfect

1. `get_design_context` sobre el nodo de Figma → specs exactas.
2. Implementar con tokens, nunca con hex sueltos.
3. Renderizar el componente aislado en `/ds` a su tamaño exacto de Figma.
4. `page.screenshot()` con Playwright a 2x.
5. `get_screenshot` del mismo nodo de Figma a la misma escala.
6. Comparar y corregir hasta que coincidan. Documentado en
   `e2e/pixel-perfect.spec.ts` con el mapa componente → nodeId.
