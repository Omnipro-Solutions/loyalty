-- Fase 3 del plan "llevar el configurador de promociones al 90%" (ver
-- docs/promociones.md §18). Cierra T03, T05, T12, T13, T14, T15, T17, T22
-- (ya cubierta por la Fase 2 — financiador/contrato/porcentaje/periodo de
-- liquidación) y T23 del documento de modalidades — T07 (acumulación
-- multi-ticket) y T18-T21 (farmacia clínica) siguen fuera de alcance.
--
-- Dos mecánicas nuevas (`precio_especial` T03, `cashback` T13), 5
-- extendidas con columnas propias nuevas (`producto_gratis` T05,
-- `multiplicador_puntos` T12, `emitir_cupon` T14, `envio_gratis` T17,
-- `bono_puntos`/`emitir_cupon` con el disparador transversal T23), y T15
-- (cupón con código) como una quinta condición (`cupon_codigo`) en el
-- árbol de `condiciones` — no una mecánica nueva, no toca esta migración
-- (`condiciones` ya es jsonb sin checks por valor de hoja).
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
    'cashback'
  )
);

-- producto_gratis (T05 · N+M cruzado): mínimo de compra y beneficio
-- parcial en el regalo.
alter table promociones add column cantidad_minima_comprada int;
alter table promociones add column beneficio_sobre_regalo_pct numeric(5, 2);

-- multiplicador_puntos (T12): cómo se resuelve si otro multiplicador
-- también aplica al mismo SKU. `tope_maximo` ya existe (columna
-- universal) — esta mecánica solo empieza a usarlo.
alter table promociones add column modo_resolucion_multiplicador text;
alter table promociones add constraint promociones_modo_resolucion_multiplicador_check check (
  modo_resolucion_multiplicador is null
  or modo_resolucion_multiplicador in ('gana_mayor', 'exponencial')
);

-- envio_gratis, como "beneficio no transaccional" (T17).
alter table promociones add column tipo_beneficio_no_transaccional text not null default 'envio_gratis';
alter table promociones add constraint promociones_tipo_beneficio_no_transaccional_check check (
  tipo_beneficio_no_transaccional in (
    'envio_gratis', 'servicio', 'meses_sin_intereses', 'descuento_aliado'
  )
);
alter table promociones add column validacion_requerida text;
alter table promociones add column cupo_disponible int;

-- emitir_cupon (T14 · cupón por umbral de puntos): disparador alterno al
-- monto de carrito, y duración propia del cupón emitido.
alter table promociones add column umbral_puntos int;
alter table promociones add column duracion_cupon_dias int;

-- Disparador transversal (T23) — declarado para `bono_puntos` y
-- `emitir_cupon`. El disparo real (que algo lo evalúe en el momento del
-- evento) es motor de evaluación, fuera de alcance.
alter table promociones add column evento_gatillo text;
alter table promociones add constraint promociones_evento_gatillo_check check (
  evento_gatillo is null
  or evento_gatillo in (
    'compra_pagada', 'devolucion', 'alta_socio', 'cumpleanos',
    'cambio_nivel', 'inactividad', 'fecha_programada', 'redencion_cupon',
    'inscripcion_programa'
  )
);
alter table promociones add column momento_resolucion text;
alter table promociones add constraint promociones_momento_resolucion_check check (
  momento_resolucion is null
  or momento_resolucion in ('en_caja', 'cierre_ticket', 'proceso_nocturno', 'al_ocurrir')
);
alter table promociones add column frecuencia_disparo text;
alter table promociones add constraint promociones_frecuencia_disparo_check check (
  frecuencia_disparo is null
  or frecuencia_disparo in ('cada_vez', 'una_vez_ano', 'una_vez_vida')
);

-- precio_especial (T03) — reusa `producto_comprado_id`, ya existente.
alter table promociones add column precio_promocional numeric(12, 2);
alter table promociones add column precio_referencia numeric(12, 2);
alter table promociones add column hasta_agotar_existencias boolean not null default false;
alter table promociones add column respeta_precio_minimo_legal boolean not null default true;

-- cashback (T13) — el monto/porcentaje reusa `valor_beneficio`, ya existente.
alter table promociones add column tipo_monedero text not null default 'porcentaje';
alter table promociones add constraint promociones_tipo_monedero_check check (
  tipo_monedero in ('porcentaje', 'monto_fijo')
);
alter table promociones add column disponibilidad_dias int;
alter table promociones add column vigencia_saldo_dias int;
alter table promociones add column monto_minimo_canje numeric(12, 2);
