/**
 * Conventional Commits + scope-enum alineado a las secciones del Figma
 * "Loyalty-Desing" y a las features/dominio del portal.
 * Amplía la lista `scope-enum` a medida que aparezcan nuevas features.
 *
 * @type {import("@commitlint/types").UserConfig}
 */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        // features / dominio (secciones 01-12 del Figma)
        "auth",
        "dashboard",
        "catalogo",
        "tiendas",
        "clientes",
        "promociones",
        "reglas",
        "journeys",
        "builder",
        "equipo",
        "audiencias",
        "integraciones",
        "profile",
        // transversal / infra
        "ui",
        "db",
        "config",
        "deps",
        "ci",
        "release",
      ],
    ],
  },
}

export default config
