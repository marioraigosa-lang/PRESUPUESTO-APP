-- ============================================================================
-- supabase_permisos_dev.sql
--
-- ⚠️  SOLO PARA DESARROLLO — NO USAR EN PRODUCCIÓN ⚠️
--
-- Este script le da al rol "anon" (el que usa la llave publishable sb_publishable
-- cuando la app todavía no tiene login de usuarios) permiso total de lectura y
-- escritura sobre las 5 tablas de Seed App: cuentas, movimientos, gastos_fijos,
-- categorias y fondo_emergencia.
--
-- Por qué falla ahora mismo:
--   Las llaves nuevas de Supabase (sb_publishable / sb_secret) ya NO heredan
--   automáticamente los privilegios de Postgres sobre las tablas, aunque el
--   Row Level Security (RLS) esté desactivado. Hay que otorgar el GRANT
--   explícitamente al rol "anon", y además (mejor práctica) dejar RLS activado
--   con una política que permita todo mientras desarrollas.
--
-- Antes de publicar la app con usuarios reales:
--   1. Implementa login (Supabase Auth).
--   2. Borra las políticas "dev_allow_all_*" creadas aquí.
--   3. Crea políticas RLS reales que filtren por auth.uid() / user_id, para que
--      cada usuario solo pueda ver y modificar sus propios datos.
--   4. Revisa los GRANT: normalmente el rol "authenticated" es el que debe
--      tener acceso, no "anon".
-- ============================================================================

-- 1) Otorgar uso del esquema public al rol anónimo
grant usage on schema public to anon;

-- 2) Otorgar permisos de lectura/escritura sobre las 5 tablas al rol anónimo
grant select, insert, update, delete
  on table public.cuentas,
           public.movimientos,
           public.gastos_fijos,
           public.categorias,
           public.fondo_emergencia
  to anon;

-- 3) Otorgar uso de las secuencias (necesario si alguna tabla usa columnas
--    tipo "serial"/"identity" para generar IDs automáticos)
grant usage, select on all sequences in schema public to anon;

-- 4) Dejar RLS activado (buena práctica incluso en desarrollo) pero con una
--    política permisiva que autoriza TODO (leer, insertar, actualizar, borrar)
--    para el rol anónimo. Esto es lo que hay que reemplazar antes de producción.

alter table public.cuentas          enable row level security;
alter table public.movimientos      enable row level security;
alter table public.gastos_fijos     enable row level security;
alter table public.categorias       enable row level security;
alter table public.fondo_emergencia enable row level security;

drop policy if exists dev_allow_all_cuentas on public.cuentas;
create policy dev_allow_all_cuentas
  on public.cuentas
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists dev_allow_all_movimientos on public.movimientos;
create policy dev_allow_all_movimientos
  on public.movimientos
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists dev_allow_all_gastos_fijos on public.gastos_fijos;
create policy dev_allow_all_gastos_fijos
  on public.gastos_fijos
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists dev_allow_all_categorias on public.categorias;
create policy dev_allow_all_categorias
  on public.categorias
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists dev_allow_all_fondo_emergencia on public.fondo_emergencia;
create policy dev_allow_all_fondo_emergencia
  on public.fondo_emergencia
  for all
  to anon
  using (true)
  with check (true);

-- ============================================================================
-- Fin del script. Con esto la app (usando la llave publishable, rol anon)
-- podrá leer y escribir libremente en las 5 tablas mientras desarrollas.
-- RECUERDA: reemplazar estas políticas "dev_allow_all_*" por políticas reales
-- basadas en auth.uid() antes de lanzar la app al público.
-- ============================================================================
