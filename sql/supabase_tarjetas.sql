-- ============================================================================
-- supabase_tarjetas.sql
--
-- FASE 1 del plan "Tarjetas de crédito" (ver conversación de diagnóstico +
-- plan de fases): crea SOLO la tabla "tarjetas" y su seguridad (RLS +
-- grants), siguiendo exactamente el mismo patrón que ya usan las demás
-- tablas de la app (cuentas, movimientos, gastos_fijos, categorias,
-- fondo_emergencia, metas_ahorro, viajes).
--
-- Por qué es una tabla NUEVA y no una columna más en "cuentas": una tarjeta
-- de crédito no tiene saldo propio del usuario (cupo_total es un tope que el
-- banco asigna, no plata del usuario) -- mezclarla con "cuentas" obligaría a
-- que CADA lugar que suma el patrimonio (Home.jsx, Emergencia.jsx,
-- cuentas_con_saldo) se acuerde de excluirla. Con una tabla aparte, ese error
-- es imposible por construcción: "cuentas" nunca va a contener una tarjeta.
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Crea la tabla "tarjetas" (si no existe).
--   2. Crea un índice sobre user_id para que las consultas ("mis tarjetas")
--      sean rápidas.
--   3. Habilita RLS en la tabla.
--   4. Crea las 4 políticas para el rol "authenticated" (select/insert/
--      update/delete) basadas en auth.uid() = user_id -- mismo patrón exacto
--      que supabase_etapa3_rls.sql (cuentas) y supabase_viajes.sql.
--   5. Otorga el GRANT de tabla necesario al rol "authenticated" (sin esto,
--      Postgres bloquea el acceso ANTES de evaluar las políticas RLS -- el
--      mismo problema que ya pasó con "perfiles", ver
--      supabase_fix_perfiles_grant.sql).
--
-- Qué NO hace este script (a propósito -- eso es Fase 2 en adelante):
--   - No toca "movimientos" (ni la columna "tarjeta_id" ni el tipo
--     'pago_tarjeta').
--   - No crea la vista "tarjetas_con_deuda".
--   - No modifica ningún código de src/.
--   - No borra tablas ni datos.
--
-- Seguro de ejecutar más de una vez: "create table if not exists", "create
-- index if not exists", "drop policy if exists" antes de cada política, y
-- los GRANT son idempotentes (repetirlos no cambia nada si ya estaban dados).
-- ============================================================================


-- ============================================================================
-- PASO 1: crear la tabla "tarjetas"
--
-- Cada fila es una tarjeta de crédito del usuario. Columnas espejo de
-- "cuentas" (mismo estilo: nombre/color/inicial para la UI, creado_en para
-- ordenar) más "cupo_total", que reemplaza el concepto de "saldo_inicial" --
-- no es un ancla de dinero propio, es el tope de crédito asignado por el
-- banco. La deuda y el cupo disponible NO son columnas acá: se calculan en
-- vivo a partir de "movimientos" en la vista "tarjetas_con_deuda" de la
-- Fase 2, con el mismo criterio que ya usa "cuentas_con_saldo" (nunca se
-- guardan, nunca pueden quedar descuadrados).
-- ============================================================================

create table if not exists public.tarjetas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  color text,
  inicial text,
  cupo_total numeric(14, 2) not null,
  creado_en timestamptz not null default now()
);


-- ============================================================================
-- PASO 2: índice sobre user_id
--
-- La consulta más frecuente será "todas las tarjetas de este usuario"
-- (seleccionarPropio('tarjetas')), así que un índice sobre user_id evita un
-- escaneo completo de la tabla a medida que crezca. Mismo criterio que
-- cuentas_user_id_idx (supabase_etapa2_usuarios.sql) y viajes_user_id_idx
-- (supabase_viajes.sql).
-- ============================================================================

create index if not exists tarjetas_user_id_idx on public.tarjetas (user_id);


-- ============================================================================
-- PASO 3: Row Level Security (RLS)
--
-- Cada usuario autenticado solo puede ver y modificar SUS PROPIAS tarjetas.
-- Mismo patrón exacto que las demás tablas (ver supabase_etapa3_rls.sql y
-- supabase_viajes.sql): 4 políticas, una por operación, todas comparando
-- auth.uid() con user_id.
-- ============================================================================

alter table public.tarjetas enable row level security;

-- Solo puede LEER sus propias tarjetas.
drop policy if exists seleccionar_propio_tarjetas on public.tarjetas;
create policy seleccionar_propio_tarjetas
  on public.tarjetas
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Solo puede INSERTAR tarjetas cuyo user_id sea el suyo (evita que alguien
-- cree una tarjeta "a nombre de" otro usuario).
drop policy if exists insertar_propio_tarjetas on public.tarjetas;
create policy insertar_propio_tarjetas
  on public.tarjetas
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Solo puede ACTUALIZAR sus propias tarjetas, y el resultado de la
-- actualización debe seguir siendo suyo (no puede cambiarle el user_id a
-- otro usuario).
drop policy if exists actualizar_propio_tarjetas on public.tarjetas;
create policy actualizar_propio_tarjetas
  on public.tarjetas
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Solo puede BORRAR sus propias tarjetas.
drop policy if exists eliminar_propio_tarjetas on public.tarjetas;
create policy eliminar_propio_tarjetas
  on public.tarjetas
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 4: GRANT al rol "authenticated"
--
-- Sin este permiso de tabla completa, Postgres bloquea el acceso ANTES de
-- siquiera evaluar las políticas RLS del paso anterior -- mismo motivo que
-- ya documentó supabase_viajes.sql. "grant usage on schema public" es
-- idempotente y ya debería estar otorgado desde hace rato (lo repiten varios
-- scripts de este proyecto por las dudas); no hace daño repetirlo acá.
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.tarjetas
  to authenticated;


-- ============================================================================
-- VERIFICACIÓN (correr esto después de todo lo anterior)
-- ============================================================================

-- 1) La tabla existe y tiene RLS habilitado (relrowsecurity debe dar "true").
-- select relname, relrowsecurity
-- from pg_class
-- where relname = 'tarjetas' and relnamespace = 'public'::regnamespace;

-- 2) Deben aparecer EXACTAMENTE 4 políticas, una por comando
--    (select/insert/update/delete), todas con auth.uid() = user_id en la
--    definición.
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'tarjetas'
-- order by cmd;

-- 3) El rol "authenticated" debe tener los 4 privilegios sobre la tabla.
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'tarjetas' and grantee = 'authenticated'
-- order by privilege_type;

-- 4) Prueba funcional (con un usuario logueado, desde el SQL Editor o la
--    consola del navegador): insertar y leer una tarjeta de prueba.
-- insert into public.tarjetas (user_id, nombre, color, inicial, cupo_total)
-- values (auth.uid(), 'Tarjeta de prueba', '#5aa9e6', 'T', 2000000);
--
-- select * from public.tarjetas; -- debe mostrar solo las tarjetas del usuario logueado
--
-- Si quieres borrar la fila de prueba:
-- delete from public.tarjetas where nombre = 'Tarjeta de prueba';


-- ============================================================================
-- Fin del script.
--
-- Qué probar después de correr esto (mismo criterio que supabase_viajes.sql):
--   1. Con un usuario logueado (A), insertar una tarjeta de prueba (ver
--      VERIFICACIÓN, punto 4) -- debe insertarse sin error de "permission
--      denied" ni de política.
--   2. select * from public.tarjetas; (como usuario A) debe mostrar solo sus
--      propias tarjetas.
--   3. Con un usuario distinto (B), select * from public.tarjetas; NO debe
--      mostrar la tarjeta de A.
--   4. La app (que todavía no tiene código para tarjetas) no debe verse
--      afectada en nada -- esta fase es 100% aditiva e invisible desde la UI.
-- ============================================================================
