import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import boundaries from "eslint-plugin-boundaries"

/**
 * Dependency architecture (each layer may only import "downwards"; features
 * are isolated from one another). Enforced with eslint-plugin-boundaries —
 * adapted from polar-portal's apps/web/eslint.config.js for a single-app repo.
 *
 *   app        → features, components, hooks, lib, config, types
 *   features   → (its own feature only), components, hooks, lib, config, types
 *   components → components, hooks, lib, config, types
 *   hooks      → hooks, lib, config, types
 *   lib        → lib, config, types
 *   config     → config, types
 *   types      → types
 *
 * External packages (next, react, @supabase/*, …) are allowed everywhere.
 * If the architecture changes, update the rules below.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "features", pattern: "src/features/*", capture: ["feature"] },
        { type: "components", pattern: "src/components/**" },
        { type: "hooks", pattern: "src/hooks/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "config", pattern: "src/config/**" },
        { type: "types", pattern: "src/types/**" },
      ],
    },
    rules: {
      "boundaries/no-unknown": "off",
      "boundaries/no-unknown-files": "off",
      // v7 API: eslint-plugin-boundaries 7.x renamed `element-types` to
      // `dependencies` and `rules` to `policies`, with object-based
      // selectors (`{ element: { type, types: { anyOf }, captured } }`) —
      // confirmed against the installed package's own README, since the
      // public migration-guide docs disagreed with each other on this.
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        "features",
                        "components",
                        "hooks",
                        "lib",
                        "config",
                        "types",
                      ],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: "features" } },
              allow: [
                {
                  to: {
                    element: {
                      type: "features",
                      captured: {
                        feature: "{{ from.element.captured.feature }}",
                      },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      types: {
                        anyOf: [
                          "components",
                          "hooks",
                          "lib",
                          "config",
                          "types",
                        ],
                      },
                    },
                  },
                },
              ],
            },
            {
              from: { element: { type: "components" } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: ["components", "hooks", "lib", "config", "types"],
                    },
                  },
                },
              },
            },
            {
              from: { element: { type: "hooks" } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ["hooks", "lib", "config", "types"] },
                  },
                },
              },
            },
            {
              from: { element: { type: "lib" } },
              allow: {
                to: {
                  element: { types: { anyOf: ["lib", "config", "types"] } },
                },
              },
            },
            {
              from: { element: { type: "config" } },
              allow: {
                to: { element: { types: { anyOf: ["config", "types"] } } },
              },
            },
            {
              from: { element: { type: "types" } },
              allow: { to: { element: { type: "types" } } },
            },
          ],
        },
      ],
    },
  },
  {
    // shadcn primitives are generated/vendored — exempt from every rule,
    // same convention as polar-portal.
    ignores: ["src/components/ui/**"],
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
])

export default eslintConfig
