-- ============================================================================
-- supabase_meta_fecha.sql
--
-- Cambia la meta de ahorro de "plazo en meses" a una fecha objetivo real
-- (mes y año), para poder calcular los meses restantes desde HOY y no desde
-- un plazo fijo que no se actualizaba solo.
--
-- Seguro de ejecutar más de una vez: usa "add column if not exists" y el
-- update solo toca la meta de ejemplo. No hay DROP ni DELETE.
--
-- La columna "plazo_meses" (agregada en supabase_meta_plazo.sql) se queda
-- en la tabla tal cual está -- no la borramos -- pero la app deja de usarla
-- a partir de este cambio.
-- ============================================================================

alter table public.metas_ahorro
  add column if not exists fecha_objetivo date;

-- Deja la fecha objetivo de la meta de ejemplo en el 31 de diciembre de 2026.
update public.metas_ahorro
  set fecha_objetivo = '2026-12-31'
  where nombre = 'Meta de ahorro 2026' and anio = 2026;

-- ============================================================================
-- Fin del script.
-- Recuerda correr este SQL en el editor SQL de Supabase antes de probar los
-- cambios de la app (editar el monto/fecha de la meta y ver la recomendación).
--
-- Nota: si tienes otras metas de ahorro creadas manualmente, quedarán con
-- fecha_objetivo en null hasta que las edites desde la app y les pongas una
-- fecha -- la app te pedirá elegirla al guardar.
-- ============================================================================
