-- Fase 1 del plan "llevar el configurador de promociones al 90%" (ver
-- docs/promociones.md). Los 23 límites del documento
-- (docs/modalidades-promocion-contexto.md L01-L23) son combinaciones de
-- 4 dimensiones (unidad, sujeto, ventana, comportamiento al exceder), no
-- 23 columnas — un solo jsonb, mismo criterio que `condiciones`/`escalones`.
--
-- `usos_por_cliente`/`usos_periodo` (L01 — veces por socio y período) y
-- `usos_totales_periodo` (L09 — redenciones totales de la promoción) se
-- migran a filas de `limites` y las 3 columnas se eliminan: dejarlas
-- convivir con el jsonb sería una segunda forma de decir lo mismo.
alter table promociones add column limites jsonb not null default '[]';

alter table promociones add constraint promociones_limites_es_array check (
  jsonb_typeof(limites) = 'array'
);

update promociones
set limites =
  case
    when usos_por_cliente is not null then jsonb_build_array(jsonb_build_object(
      'unidad', 'veces',
      'sujeto', 'socio',
      'ventana', case usos_periodo
        when 'sin_limite' then 'vida'
        when 'dia' then 'dia'
        when 'semana' then 'semana'
        else 'mes_calendario'
      end,
      'tope', usos_por_cliente,
      'alExceder', 'descartar'
    ))
    else '[]'::jsonb
  end
  ||
  case
    when usos_totales_periodo is not null then jsonb_build_array(jsonb_build_object(
      'unidad', 'veces',
      'sujeto', 'promocion',
      'ventana', 'campana',
      'tope', usos_totales_periodo,
      'alExceder', 'descartar'
    ))
    else '[]'::jsonb
  end;

alter table promociones drop column usos_por_cliente;
alter table promociones drop column usos_periodo;
alter table promociones drop column usos_totales_periodo;
