-- El detalle del cupón (13.4) dibuja "Entregado por email" y "Cupón
-- visualizado" en la línea de tiempo — el doc los había excluido porque no
-- hay sender de email/SMS ni tracking de apertura en este proyecto y
-- emitirlos sería dato fabricado (ver comentario original en
-- 20260824110000_cupones_esquema.sql). Decisión revisada: existen para
-- reflejar entregas y aperturas que en producción llegarían de una
-- integración externa (proveedor de email, SDK de la app) — en esta demo
-- se siembran como datos de ejemplo, no como eventos reales generados por
-- el sistema.
alter table coupon_event drop constraint coupon_event_type_check;
alter table coupon_event add constraint coupon_event_type_check check (type in (
  'batch_created', 'authorization_signed',
  'approval_requested', 'approval_granted', 'approval_rejected', 'approval_revoked', 'approval_withdrawn',
  'generation_started', 'generation_completed',
  'issued', 'assigned', 'unassigned', 'validity_extended',
  'redeemed', 'redemption_rejected', 'expired', 'cancelled', 'printed', 'exported',
  'delivered', 'viewed'
));
