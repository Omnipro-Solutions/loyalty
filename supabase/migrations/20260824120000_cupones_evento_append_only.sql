-- `coupon_event` se diseñó como append-only de verdad (a diferencia de
-- `producto_eventos`, que documenta esa intención pero concede CRUD
-- completo) — pero el proyecto tiene privilegios por defecto que ya
-- conceden UPDATE/DELETE a `authenticated` sobre toda tabla nueva,
-- independientemente de qué se otorgue explícitamente en la migración que
-- la crea (verificado: `producto_eventos` sufre lo mismo). Un `grant
-- select, insert` no basta para cerrar esa puerta — hay que revocar
-- explícitamente lo que el privilegio por defecto ya concedió.
revoke update, delete on coupon_event from authenticated;
