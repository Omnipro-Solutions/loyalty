-- Ciclo de vida de la promoción: `estado_publicacion` pasa de dos valores
-- ('borrador', 'activa') a los cuatro que se eligen en el paso "Resumen" del
-- formulario de creación, y que después de crearla son lo ÚNICO editable
-- (el resto de campos queda de solo lectura, ver
-- `features/promotions/components/promotion-form.tsx`).
--
--   borrador   · aún no publicada, sigue siendo editable
--   activa     · publicada; el motor la evalúa
--   inactiva   · publicada pero suspendida; el motor la ignora
--   finalizada · cerrada manualmente antes o después de su vigencia
--
-- `programada` NO se guarda: se deriva cruzando 'activa' con
-- vigente_desde/vigente_hasta (ver `features/promotions/lib/status.ts`).
--
-- Las filas existentes solo tienen 'borrador'/'activa', así que el nuevo
-- check las acepta todas sin necesidad de migrar datos.

alter table promociones
  drop constraint promociones_estado_publicacion_check;

alter table promociones
  add constraint promociones_estado_publicacion_check check (
    estado_publicacion in ('borrador', 'activa', 'inactiva', 'finalizada')
  );
