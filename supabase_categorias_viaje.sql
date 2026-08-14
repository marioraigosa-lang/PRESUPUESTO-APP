-- ============================================================================
-- supabase_categorias_viaje.sql
--
-- FASE 2 de "Planifica tus viajes": crea SOLO la tabla "categorias_viaje" y su
-- seguridad (RLS + grants), siguiendo exactamente el mismo patrón que
-- supabase_viajes.sql (Fase 1).
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Crea la tabla "categorias_viaje" (si no existe).
--   2. Crea índices sobre user_id y sobre viaje_id, porque la consulta más
--      frecuente será "las categorías de este viaje".
--   3. Habilita RLS en la tabla.
--   4. Crea las 4 políticas para el rol "authenticated" (select/insert/
--      update/delete) basadas en auth.uid() = user_id — igual que en
--      supabase_viajes.sql.
--   5. Otorga el GRANT de tabla necesario al rol "authenticated" (sin esto,
--      Postgres bloquea el acceso ANTES de evaluar las políticas RLS — el
--      mismo problema que ya nos pasó con "perfiles", ver
--      supabase_fix_perfiles_grant.sql).
--
-- Qué NO hace este script:
--   - No crea "gastos_viaje" (viene en una fase siguiente).
--   - No siembra las 6 categorías por defecto (Tiquetes avión, Costos de
--     desplazamiento, Alimentación, Hotel, Souvenirs, Otros): eso se hace
--     desde el CÓDIGO (el servicio), al crear un viaje, usando t() para que
--     nazcan en el idioma del usuario. Este SQL no crea ningún trigger ni
--     inserta filas.
--   - No borra tablas ni datos.
--   - No modifica el código de la app.
--   - Esta tabla es un "mundo aparte": no tiene relación con las categorías
--     reales de la app (gastos fijos/variables) ni con ninguna otra tabla
--     financiera.
--
-- Seguro de ejecutar más de una vez: "create table if not exists", "create
-- index if not exists", "drop policy if exists" antes de cada política, y
-- los GRANT son idempotentes (repetirlos no cambia nada si ya estaban dados).
-- ============================================================================


-- ============================================================================
-- PASO 1: crear la tabla "categorias_viaje"
--
-- Cada fila es una categoría de gasto dentro de un viaje (ej. "Hotel" con
-- presupuesto 500 USD). viaje_id la asocia a un viaje concreto de la tabla
-- "viajes" (Fase 1); user_id identifica al dueño, igual que en el resto de
-- tablas de la app. moneda es una sola moneda por categoría (no hay mezcla
-- de monedas dentro de una misma categoría).
-- ============================================================================

create table if not exists public.categorias_viaje (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  viaje_id uuid not null references public.viajes(id) on delete cascade,
  nombre text not null,
  emoji text,
  presupuesto numeric(14,2) not null default 0,
  moneda text not null default 'COP' check (moneda in ('COP','USD','EUR')),
  creado_en timestamptz not null default now()
);


-- ============================================================================
-- PASO 2: índices sobre user_id y viaje_id
--
-- Las consultas más frecuentes serán "todas las categorías de este usuario"
-- y, sobre todo, "las categorías de este viaje" (al abrir el detalle de un
-- viaje), así que indexamos ambas columnas para evitar escaneos completos de
-- la tabla a medida que crezca.
-- ============================================================================

create index if not exists categorias_viaje_user_id_idx on public.categorias_viaje(user_id);
create index if not exists categorias_viaje_viaje_id_idx on public.categorias_viaje(viaje_id);


-- ============================================================================
-- PASO 3: Row Level Security (RLS)
--
-- Cada usuario autenticado solo puede ver y modificar SUS PROPIAS categorías
-- de viaje. Mismo patrón exacto que la tabla "viajes" (ver
-- supabase_viajes.sql y supabase_etapa3_rls.sql).
-- ============================================================================

alter table public.categorias_viaje enable row level security;

-- Solo puede LEER sus propias categorías de viaje.
drop policy if exists seleccionar_propio_categorias_viaje on public.categorias_viaje;
create policy seleccionar_propio_categorias_viaje
  on public.categorias_viaje
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Solo puede INSERTAR categorías cuyo user_id sea el suyo (no puede crear
-- una categoría "a nombre de" otro usuario).
drop policy if exists insertar_propio_categorias_viaje on public.categorias_viaje;
create policy insertar_propio_categorias_viaje
  on public.categorias_viaje
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Solo puede ACTUALIZAR sus propias categorías de viaje, y el resultado de
-- la actualización debe seguir siendo suyo (no puede cambiarle el user_id a
-- otro usuario).
drop policy if exists actualizar_propio_categorias_viaje on public.categorias_viaje;
create policy actualizar_propio_categorias_viaje
  on public.categorias_viaje
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Solo puede BORRAR sus propias categorías de viaje.
drop policy if exists eliminar_propio_categorias_viaje on public.categorias_viaje;
create policy eliminar_propio_categorias_viaje
  on public.categorias_viaje
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ============================================================================
-- PASO 4: GRANT al rol "authenticated"
--
-- Sin este permiso de tabla completa, Postgres bloquea el acceso ANTES de
-- siquiera evaluar las políticas RLS del paso anterior — es la misma causa
-- del error "permission denied for table perfiles" que ya se corrigió en
-- supabase_fix_perfiles_grant.sql. Lo evitamos desde ahora para
-- "categorias_viaje".
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.categorias_viaje
  to authenticated;


-- ============================================================================
-- Fin del script.
--
-- Qué probar después de correr esto (en el SQL Editor de Supabase, o luego
-- desde la app una vez esté el código de la Fase 2):
--   1. Con un usuario logueado (A) que ya tenga un viaje de prueba, insertar
--      una categoría de prueba:
--      insert into public.categorias_viaje (user_id, viaje_id, nombre, emoji, presupuesto, moneda)
--      values (auth.uid(), '<id-del-viaje-de-A>', 'Hotel', '🏨', 500, 'USD');
--      Debe insertarse sin error de "permission denied" ni de política.
--   2. select * from public.categorias_viaje where viaje_id = '<id-del-viaje-de-A>';
--      (como usuario A) debe mostrar solo esa categoría.
--   3. Con un usuario distinto (B), esa misma consulta NO debe mostrar la
--      categoría de A.
--   4. Si quieres borrar la fila de prueba: delete from public.categorias_viaje
--      where nombre = 'Hotel de prueba';
-- ============================================================================
