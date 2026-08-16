-- ============================================================================
-- supabase_viajes.sql
--
-- FASE 1 de "Planifica tus viajes": crea SOLO la tabla "viajes" y su
-- seguridad (RLS + grants), siguiendo exactamente el mismo patrón que ya usan
-- las demás tablas de la app (cuentas, movimientos, gastos_fijos, categorias,
-- fondo_emergencia, metas_ahorro).
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Crea la tabla "viajes" (si no existe).
--   2. Crea un índice sobre user_id para que las consultas ("mis viajes")
--      sean rápidas.
--   3. Habilita RLS en la tabla.
--   4. Crea las 4 políticas para el rol "authenticated" (select/insert/
--      update/delete) basadas en auth.uid() = user_id — igual a
--      supabase_etapa3_rls.sql.
--   5. Otorga el GRANT de tabla necesario al rol "authenticated" (sin esto,
--      Postgres bloquea el acceso ANTES de evaluar las políticas RLS — es el
--      mismo problema que ya nos pasó con "perfiles", ver
--      supabase_fix_perfiles_grant.sql).
--
-- Qué NO hace este script:
--   - No crea "categorias_viaje" ni "gastos_viaje" (vienen en fases
--     siguientes).
--   - No borra tablas ni datos.
--   - No modifica el código de la app.
--   - Esta tabla es un "mundo aparte": no tiene relación con cuentas,
--     movimientos ni ninguna otra tabla financiera real de la app.
--
-- Seguro de ejecutar más de una vez: "create table if not exists", "create
-- index if not exists", "drop policy if exists" antes de cada política, y
-- los GRANT son idempotentes (repetirlos no cambia nada si ya estaban dados).
-- ============================================================================


-- ============================================================================
-- PASO 1: crear la tabla "viajes"
--
-- Cada fila es un viaje planificado por un usuario (ej. "París 2026").
-- user_id identifica al dueño, igual que en el resto de tablas de la app.
-- ============================================================================

create table if not exists public.viajes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  adultos integer not null default 1,
  ninos integer not null default 0,
  fecha_desde date,
  fecha_hasta date,
  origen text,
  destino text,
  creado_en timestamptz not null default now()
);


-- ============================================================================
-- PASO 2: índice sobre user_id
--
-- La consulta más frecuente será "todos los viajes de este usuario"
-- (seleccionar_propio('viajes')), así que un índice sobre user_id evita un
-- escaneo completo de la tabla a medida que crezca.
-- ============================================================================

create index if not exists viajes_user_id_idx on public.viajes(user_id);


-- ============================================================================
-- PASO 3: Row Level Security (RLS)
--
-- Cada usuario autenticado solo puede ver y modificar SUS PROPIOS viajes.
-- Mismo patrón exacto que las demás tablas (ver supabase_etapa3_rls.sql).
-- ============================================================================

alter table public.viajes enable row level security;

-- Solo puede LEER sus propios viajes.
drop policy if exists seleccionar_propio_viajes on public.viajes;
create policy seleccionar_propio_viajes
  on public.viajes
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Solo puede INSERTAR viajes cuyo user_id sea el suyo (no puede crear un
-- viaje "a nombre de" otro usuario).
drop policy if exists insertar_propio_viajes on public.viajes;
create policy insertar_propio_viajes
  on public.viajes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Solo puede ACTUALIZAR sus propios viajes, y el resultado de la
-- actualización debe seguir siendo suyo (no puede cambiarle el user_id a
-- otro usuario).
drop policy if exists actualizar_propio_viajes on public.viajes;
create policy actualizar_propio_viajes
  on public.viajes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Solo puede BORRAR sus propios viajes.
drop policy if exists eliminar_propio_viajes on public.viajes;
create policy eliminar_propio_viajes
  on public.viajes
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 4: GRANT al rol "authenticated"
--
-- Sin este permiso de tabla completa, Postgres bloquea el acceso ANTES de
-- siquiera evaluar las políticas RLS del paso anterior — es la misma causa
-- del error "permission denied for table perfiles" que ya se corrigió en
-- supabase_fix_perfiles_grant.sql. Lo evitamos desde ahora para "viajes".
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.viajes
  to authenticated;


-- ============================================================================
-- Fin del script.
--
-- Qué probar después de correr esto (en el SQL Editor de Supabase, o luego
-- desde la app una vez esté el código de la Fase 1):
--   1. Con un usuario logueado (A), insertar una fila de prueba:
--      insert into public.viajes (user_id, nombre, adultos, ninos, destino)
--      values (auth.uid(), 'Viaje de prueba', 2, 1, 'Cartagena');
--      Debe insertarse sin error de "permission denied" ni de política.
--   2. select * from public.viajes; (como usuario A) debe mostrar solo sus
--      propios viajes.
--   3. Con un usuario distinto (B), select * from public.viajes; NO debe
--      mostrar el viaje de A.
--   4. Si quieres borrar la fila de prueba: delete from public.viajes where
--      nombre = 'Viaje de prueba';
-- ============================================================================
