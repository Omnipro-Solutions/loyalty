-- Completa "Vigencia" con días de la semana + horario (Figma
-- "07.5 · Paso 4 · Vigencia", 1399:6) y agrega el paso "Límites y
-- stacking" (Figma "07.6 · Paso 5 · Límites y stacking", 1401:28) —
-- `usos_por_cliente`/`usos_periodo`/`presupuesto_asignado` ya existían
-- (antes vivían repartidos entre "Configuración"/"Vigencia" en el
-- asistente, se reubican solo en la UI); lo nuevo aquí son las 6 columnas
-- de abajo.
alter table promociones add column dias_semana text[];
alter table promociones add constraint promociones_dias_semana_validos check (
  dias_semana is null
  or dias_semana <@ array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']::text[]
);

alter table promociones add column hora_inicio time;
alter table promociones add column hora_fin time;

-- Tope total de canjes de TODOS los clientes combinados — distinto de
-- `usos_por_cliente` (tope por cliente individual, ya existente).
alter table promociones add column usos_totales_periodo int;

-- Grupo de exclusión (texto libre, sin tabla de catálogo aparte — el
-- propio Figma lo dibuja como texto, no como un select contra una lista
-- predefinida) y modo de resolución cuando varias promociones podrían
-- aplicar a la vez. Más granular que `acumulable` (que solo dice si ESTA
-- promoción admite combinarse, no cómo se decide cuál gana).
alter table promociones add column grupo_exclusion text;
alter table promociones add column modo_multiple text not null default 'mejor_beneficio';
alter table promociones add constraint promociones_modo_multiple_check check (
  modo_multiple in ('mejor_beneficio', 'mayor_prioridad', 'todas_acumulan')
);
