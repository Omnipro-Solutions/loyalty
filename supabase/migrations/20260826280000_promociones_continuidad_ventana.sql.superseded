-- La ventana de continuidad deja de estar fijada a días: ahora se declara
-- como cantidad + unidad (días, semanas, meses, bimestres), porque una
-- escalera de adherencia mensual o bimestral es tan común como la de 35
-- días del caso de referencia.
--
-- Se REEMPLAZA `ventana_continuidad_dias` en vez de reinterpretarla: dejar
-- una columna llamada `_dias` guardando "2" cuando el operador eligió "2
-- meses" es una mentira en el modelo de datos, y el siguiente que lea la
-- tabla (o una consulta de reporte) la creería literal.
--
-- La conversión a días para evaluar la regla vive en
-- `features/promotions/lib/continuity-discount.ts`
-- (`CONTINUITY_WINDOW_UNIT_DAYS`), no aquí: meses y bimestres se aproximan
-- a 30 y 60 días, y esa aproximación es una decisión de producto que debe
-- estar en un solo sitio y bajo test, no repartida entre SQL y TS.

alter table promociones add column ventana_continuidad_cantidad int;

alter table promociones add column ventana_continuidad_unidad text check (
  ventana_continuidad_unidad is null
  or ventana_continuidad_unidad in ('dias', 'semanas', 'meses', 'bimestres')
);

-- Las promociones existentes tenían la ventana en días por definición.
update promociones
set
  ventana_continuidad_cantidad = ventana_continuidad_dias,
  ventana_continuidad_unidad = 'dias'
where ventana_continuidad_dias is not null;

-- El check de 20260826180000_promociones_continuidad.sql apunta a la
-- columna que se va: se rehace sobre las nuevas (y ahora también exige la
-- unidad, porque una cantidad sin unidad no es interpretable).
alter table promociones drop constraint promociones_continuidad_requerida;

alter table promociones add constraint promociones_continuidad_requerida check (
  tipo_beneficio <> 'descuento_continuidad'
  or (
    escalones is not null
    and jsonb_typeof(escalones) = 'array'
    and jsonb_array_length(escalones) >= 2
    and ventana_continuidad_cantidad is not null
    and ventana_continuidad_unidad is not null
  )
);

alter table promociones drop column ventana_continuidad_dias;

-- `acumula_retroactivo` pasa a ser, en la UI, "¿evalúa el historial de
-- compras previo a la promoción?" — misma semántica exacta que ya tenía
-- ("la acumulación inicia con el lanzamiento del programa"), enunciada
-- desde la pregunta que se hace el operador. No se renombra la columna:
-- el dato y su significado no cambian, solo la etiqueta del formulario.
comment on column promociones.acumula_retroactivo is
  'descuento_continuidad: si la racha evalúa el historial de compras anterior al inicio de la promoción.';
