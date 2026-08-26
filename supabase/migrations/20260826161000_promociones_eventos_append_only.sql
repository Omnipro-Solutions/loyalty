-- `promocion_eventos` es append-only de verdad (mismo motivo que
-- `coupon_event`, ver 20260824120000_cupones_evento_append_only.sql): los
-- privilegios por defecto de este proyecto conceden UPDATE/DELETE a
-- `authenticated` sobre toda tabla nueva sin importar el `grant` explícito
-- de la migración que la crea — hay que revocarlo aparte.
revoke update, delete on promocion_eventos from authenticated;
