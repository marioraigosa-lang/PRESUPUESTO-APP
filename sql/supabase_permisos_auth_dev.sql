-- ============================================================================
-- supabase_permisos_auth_dev.sql
--
-- ⚠️  SOLO PARA DESARROLLO — NO USAR EN PRODUCCIÓN ⚠️
--
-- Contexto (Etapa 1 → Etapa 2):
--   Ya implementamos el login con Supabase Auth. Ahora la app se conecta con
--   el rol "authenticated" (usuario logueado) en vez del rol "anon". Pero los
--   permisos de desarrollo (supabase_permisos_dev.sql) solo se le dieron a
--   "anon", por eso aparece el error "permission denied for table cuentas"
--   (y lo mismo para movimientos, gastos_fijos, categorias, fondo_emergencia
--   y metas_ahorro) apenas el usuario inicia sesión.
--
-- Qué hace este script:
--   Le da al rol "authenticated" EXACTAMENTE los mismos permisos amplios de
--   desarrollo que ya tiene "anon": lectura y escritura total sobre las 6
--   tablas de Saldo App, sin filtrar todavía por usuario. Es decir, en este
--   momento CUALQUIER usuario logueado puede ver y modificar los datos de
--   CUALQUIER otro usuario. Esto es aceptable temporalmente porque seguimos
--   en desarrollo (Etapa 2: multiusuario sin aislamiento de datos todavía).
--
-- IMPORTANTE — esto es temporal:
--   En la Etapa 3 (RLS real) hay que:
--   1. Borrar las políticas "dev_allow_all_auth_*" creadas aquí.
--   2. Crear políticas RLS que filtren por auth.uid() = user_id (o el nombre
--      de la columna que identifique al dueño del registro en cada tabla),
--      para que cada usuario solo pueda ver y modificar SUS PROPIOS datos.
--   3. Verificar que cada tabla tenga una columna que relacione el registro
--      con el usuario dueño (ej. user_id uuid references auth.users) antes
--      de escribir esas políticas reales.
--
-- Este script es seguro de ejecutar varias veces (usa "drop policy if
-- exists" antes de cada "create policy"). No borra tablas ni datos.
-- ============================================================================

-- 1) Otorgar uso del esquema public al rol authenticated
grant usage on schema public to authenticated;

-- 2) Otorgar permisos de lectura/escritura sobre las 6 tablas al rol authenticated
grant select, insert, update, delete
  on table public.cuentas,
           public.movimientos,
           public.gastos_fijos,
           public.categorias,
           public.fondo_emergencia,
           public.metas_ahorro
  to authenticated;

-- 3) Otorgar uso de las secuencias (necesario si alguna tabla usa columnas
--    tipo "serial"/"identity" para generar IDs automáticos)
grant usage, select on all sequences in schema public to authenticated;

-- 4) Dejar RLS activado (buena práctica incluso en desarrollo) pero con una
--    política permisiva que autoriza TODO (leer, insertar, actualizar, borrar)
--    para el rol authenticated. Esto es lo que hay que reemplazar en la
--    Etapa 3 por políticas que filtren por auth.uid().

alter table public.cuentas          enable row level security;
alter table public.movimientos      enable row level security;
alter table public.gastos_fijos     enable row level security;
alter table public.categorias       enable row level security;
alter table public.fondo_emergencia enable row level security;
alter table public.metas_ahorro     enable row level security;

drop policy if exists dev_allow_all_auth_cuentas on public.cuentas;
create policy dev_allow_all_auth_cuentas
  on public.cuentas
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists dev_allow_all_auth_movimientos on public.movimientos;
create policy dev_allow_all_auth_movimientos
  on public.movimientos
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists dev_allow_all_auth_gastos_fijos on public.gastos_fijos;
create policy dev_allow_all_auth_gastos_fijos
  on public.gastos_fijos
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists dev_allow_all_auth_categorias on public.categorias;
create policy dev_allow_all_auth_categorias
  on public.categorias
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists dev_allow_all_auth_fondo_emergencia on public.fondo_emergencia;
create policy dev_allow_all_auth_fondo_emergencia
  on public.fondo_emergencia
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists dev_allow_all_auth_metas_ahorro on public.metas_ahorro;
create policy dev_allow_all_auth_metas_ahorro
  on public.metas_ahorro
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================================
-- Fin del script. Con esto la app, ya logueada (rol authenticated), podrá
-- leer y escribir libremente en las 6 tablas mientras se construyen las
-- Etapas 2 y 3.
--
-- RECUERDA: estas políticas "dev_allow_all_auth_*" son de DESARROLLO y NO
-- aíslan los datos por usuario. En la Etapa 3 deben reemplazarse por
-- políticas reales basadas en auth.uid() antes de lanzar la app con datos
-- reales de varios usuarios.
-- ============================================================================
