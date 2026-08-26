-- Alinea el vocabulario de `promocion_eventos.tipo` con el ciclo de vida
-- real de la promoción (`estado_publicacion`, ver
-- 20260826210000_promociones_estado_publicacion.sql):
--
--   'pausada'    → 'inactivada'   (mismo evento, nombre del nuevo estado)
--   + 'finalizada'                (cierre manual; distinto de 'vencida',
--                                  que es el sistema al pasar la vigencia)
--   + 'editada'                   (un borrador que se vuelve a guardar; una
--                                  promoción publicada ya no admite cambios
--                                  de campos, solo de estado, así que este
--                                  evento solo puede venir de un borrador)
--
-- Se renombra en vez de coexistir con 'pausada' para no dejar dos valores
-- sinónimos en el mismo `check`: la bitácora tiene que hablar el mismo
-- idioma que el estado que muestra la UI. Las filas sembradas por las
-- migraciones de demo se actualizan aquí mismo — insertaron 'pausada'
-- cuando el check todavía lo permitía, así que un `db reset` limpio
-- también funciona.
--
-- 'cancelada' y 'vencida' se quedan: no son alcanzables desde la UI nueva
-- (ningún estado es 'cancelada'), pero sí existen en los datos de demo y
-- describen eventos de sistema que el modelo sigue contemplando.

update promocion_eventos set tipo = 'inactivada' where tipo = 'pausada';

alter table promocion_eventos
  drop constraint promocion_eventos_tipo_check;

alter table promocion_eventos
  add constraint promocion_eventos_tipo_check check (
    tipo in (
      'creada',
      'editada',
      'activada',
      'inactivada',
      'finalizada',
      'presupuesto_incrementado',
      'presupuesto_agotado',
      'vencida',
      'cancelada',
      'canje',
      'canje_rechazado'
    )
  );
