-- Canal real del evento — distinto de `promociones.canal_aplicacion` (config
-- de la promoción, admite 'pos_ecommerce' combinado). Un evento ocurre en UN
-- canal concreto, así que solo 'pos'/'ecommerce'. Nulo en eventos de ciclo de
-- vida (creada/activada/...) — solo se captura en canje/canje_rechazado.
-- Alimenta "Atribución de canjes por canal" y la columna Canal de la
-- bitácora (Panel de promociones).
alter table promocion_eventos add column canal text;
alter table promocion_eventos add constraint promocion_eventos_canal_check check (
  canal is null or canal in ('pos', 'ecommerce')
);
