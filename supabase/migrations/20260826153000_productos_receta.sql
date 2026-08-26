-- RX/OTC (docs/promociones.md §8): distinción real de si un producto exige
-- receta médica, para poder condicionar reglas de promoción y bloques del
-- Loyalty Builder sobre ella — hasta ahora solo existía `promociones.
-- aplica_a_rx` (una declaración manual del operador a nivel de promoción,
-- ver `20260826140000_promociones_reglas_gates.sql`), sin ningún dato real
-- del catálogo detrás. Booleano simple (no `check` de texto): es la misma
-- pregunta binaria que `members.tiene_hijos`/`tiene_mascotas`, no una
-- clasificación abierta como `tipo_producto`.
alter table productos
  add column requiere_receta boolean not null default false;
