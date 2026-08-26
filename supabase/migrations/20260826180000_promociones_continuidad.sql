-- Nueva mecánica `descuento_continuidad` — escalera de descuento que crece
-- con cada compra consecutiva del cliente dentro de una ventana de días
-- (docs/promociones.md, variante V11 "Escalera de racha o adherencia" de
-- docs/modalidades-promocion-contexto.md:1962-1978). Ej.: 1ª compra 20 %,
-- 2ª 25 %, 3ª 30 %, 4ª 35 % — se conserva el avance si la siguiente compra
-- ocurre dentro de la ventana; si no, se rompe la continuidad.
--
-- CAMBIO DE ALCANCE explícito frente a docs/promociones.md:688-690 y
-- :826-828, que declaraban T07 (acumulación multi-ticket) y T18
-- (adherencia a tratamiento) fuera de alcance por exigir "un contador vivo
-- entre tickets". Esta mecánica sigue sin construir ese contador — mismo
-- criterio que `TRIGGER_EVENTS` (src/types/domain.ts): queda declarada y
-- persistida, evaluable solo cuando exista un motor de evaluación por
-- evento (fuera de alcance, igual que el resto del módulo). Deliberadamente
-- NO es T18: no lleva inscripción ni padrón de pacientes (T18 es un dominio
-- regulado de datos de salud) — es la escalera genérica V11, sin el
-- vehículo "Inscripción" que T18 exige.
--
-- Reusa `escalones`/`umbral_tipo`/`modo_calculo` de
-- 20260825090000_promociones_descuento_escalonado.sql: aquí `umbral` es el
-- ordinal de compra consecutiva (1, 2, 3, 4…), no unidades/monto del
-- carrito, y `umbral_tipo`/`modo_calculo` quedan `null` para esta mecánica
-- (no aplican). Mismo criterio de reuso ya usado con `producto_comprado_id`
-- entre `producto_gratis`/`por_piezas`/`precio_especial`.
alter table promociones drop constraint promociones_tipo_beneficio_check;
alter table promociones add constraint promociones_tipo_beneficio_check check (
  tipo_beneficio in (
    'descuento_porcentual',
    'descuento_monto_fijo',
    'envio_gratis',
    'producto_gratis',
    'precio_fijo_bundle',
    'descuento_escalonado',
    'por_piezas',
    'multiplicador_puntos',
    'bono_puntos',
    'emitir_cupon',
    'precio_especial',
    'cashback',
    'descuento_continuidad'
  )
);

-- Días máximos entre dos compras consecutivas para conservar el escalón
-- alcanzado — "ventana de 35 días" del caso de referencia.
alter table promociones add column ventana_continuidad_dias int;

-- Qué pasa cuando el cliente excede la ventana: vuelve al escalón 1
-- (`reiniciar`, el caso real de referencia), baja un escalón (`retroceder_
-- un_escalon`, el "descenso suave" que docs/promociones.md §7.1b marca
-- como patrón de mercado) o no pierde el avance (`mantener`).
alter table promociones add column al_romper_continuidad text check (
  al_romper_continuidad is null
  or al_romper_continuidad in ('reiniciar', 'retroceder_un_escalon', 'mantener')
);

-- "La acumulación de compras inicia con el lanzamiento del programa — no
-- cuenta compras retroactivas anteriores." Sin esta columna, no hay forma
-- de declarar esa regla del programa de referencia.
alter table promociones add column acumula_retroactivo boolean not null default false;

-- "No aplica en devoluciones" del caso de referencia — pero una devolución
-- podría, en otro programa, romper la racha o retroceder el escalón; se
-- declaran las 3 variantes en vez de asumir siempre "no afecta". Mismo
-- campo que pide la ficha T07 (`efecto_devolucion`,
-- docs/modalidades-promocion-contexto.md:3235).
alter table promociones add column efecto_devolucion text check (
  efecto_devolucion is null
  or efecto_devolucion in ('no_afecta', 'rompe_racha', 'retrocede_escalon')
);

-- "El descuento se aplica sobre las 2 piezas de menor precio" — qué piezas
-- elegibles reciben el beneficio cuando el límite de piezas (paso
-- Límites) topa el número de unidades.
alter table promociones add column criterio_seleccion_piezas text check (
  criterio_seleccion_piezas is null
  or criterio_seleccion_piezas in ('menor_precio', 'mayor_precio')
);

-- Espejo en SQL del `superRefine` de features/promotions/schemas.ts: sin
-- al menos 2 escalones y su ventana de continuidad, esta mecánica no es
-- interpretable por ningún motor de evaluación futuro.
alter table promociones add constraint promociones_continuidad_requerida check (
  tipo_beneficio <> 'descuento_continuidad'
  or (
    escalones is not null
    and jsonb_typeof(escalones) = 'array'
    and jsonb_array_length(escalones) >= 2
    and ventana_continuidad_dias is not null
  )
);
