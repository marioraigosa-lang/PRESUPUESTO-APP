-- ============================================================================
-- supabase_gastos_viaje.sql
--
-- FASE 3 de "Planifica tus viajes": crea SOLO la tabla "gastos_viaje" y su
-- seguridad (RLS + grants), siguiendo exactamente el mismo patrón que
-- supabase_viajes.sql (Fase 1) y supabase_categorias_viaje.sql (Fase 2).
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Crea la tabla "gastos_viaje" (si no existe).
--   2. Crea índices sobre user_id, viaje_id y categoria_viaje_id, porque las
--      consultas más frecuentes serán "los gastos de este viaje" y "los
--      gastos de esta categoría".
--   3. Habilita RLS en la tabla.
--   4. Crea las 4 políticas para el rol "authenticated" (select/insert/
--      update/delete) basadas en auth.uid() = user_id — igual que en las
--      dos tablas anteriores.
--   5. Otorga el GRANT de tabla necesario al rol "authenticated" (sin esto,
--      Postgres bloquea el acceso ANTES de evaluar las políticas RLS — el
--      mismo problema que ya nos pasó con "perfiles", ver
--      supabase_fix_perfiles_grant.sql).
--
-- Qué NO hace este script:
--   - No valida en la base de datos que una categoría con gastos no se
--     pueda borrar; esa regla de negocio se aplica en el CÓDIGO (servicio),
--     en la Fase 3. Aquí solo hay una red de seguridad a nivel de base de
--     datos (ver PASO 1 más abajo, columna categoria_viaje_id).
--   - No borra tablas ni datos.
--   - No modifica el código de la app.
--   - Esta tabla es un "mundo aparte": no tiene relación con las categorías
--     ni cuentas reales de la app (gastos fijos/variables), solo con
--     "viajes" y "categorias_viaje".
--
-- Seguro de ejecutar más de una vez: "create table if not exists", "create
-- index if not exists", "drop policy if exists" antes de cada política, y
-- los GRANT son idempotentes (repetirlos no cambia nada si ya estaban dados).
-- ============================================================================


-- ============================================================================
-- PASO 1: crear la tabla "gastos_viaje"
--
-- Cada fila es un gasto puntual dentro de un viaje (ej. "Taxi al aeropuerto"
-- por 25 USD el 2026-03-10). viaje_id lo asocia al viaje (tabla "viajes",
-- Fase 1); categoria_viaje_id lo asocia a una categoría de ESE viaje (tabla
-- "categorias_viaje", Fase 2); user_id identifica al dueño, igual que en el
-- resto de tablas de la app. moneda es propia de cada gasto (el usuario la
-- elige al registrarlo, no hereda la de la categoría).
--
-- Los "on delete" de las dos referencias son distintos a propósito:
--   - viaje_id ... on delete cascade
--     Si se borra el viaje completo, no tiene sentido conservar sus gastos
--     sueltos: se borran junto con él.
--   - categoria_viaje_id ... on delete set null
--     La regla de negocio (aplicada en el código, Fase 3) es que NUNCA se
--     debe poder borrar una categoría que todavía tiene gastos asignados.
--     Por eso, en el flujo normal, este "set null" nunca debería activarse.
--     Se deja como red de seguridad a nivel de base de datos: si por
--     cualquier vía (un bug, un borrado manual en el SQL Editor, etc.) una
--     categoría se borra igual, el gasto NO desaparece ni queda huérfano de
--     una fila inexistente — simplemente queda sin categoría, en vez de
--     perderse el registro del dinero gastado.
-- ============================================================================

create table if not exists public.gastos_viaje (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  viaje_id uuid not null references public.viajes(id) on delete cascade,
  categoria_viaje_id uuid references public.categorias_viaje(id) on delete set null,
  fecha date not null,
  monto numeric(14,2) not null,
  moneda text not null default 'COP' check (moneda in ('COP','USD','EUR')),
  descripcion text,
  creado_en timestamptz not null default now()
);


-- ============================================================================
-- PASO 2: índices sobre user_id, viaje_id y categoria_viaje_id
--
-- Las consultas más frecuentes serán "todos los gastos de este usuario",
-- "los gastos de este viaje" (al abrir el detalle de un viaje) y "los gastos
-- de esta categoría" (al mostrar el gasto acumulado por categoría), así que
-- indexamos las tres columnas para evitar escaneos completos de la tabla a
-- medida que crezca.
-- ============================================================================

create index if not exists gastos_viaje_user_id_idx on public.gastos_viaje(user_id);
create index if not exists gastos_viaje_viaje_id_idx on public.gastos_viaje(viaje_id);
create index if not exists gastos_viaje_categoria_viaje_id_idx on public.gastos_viaje(categoria_viaje_id);


-- ============================================================================
-- PASO 3: Row Level Security (RLS)
--
-- Cada usuario autenticado solo puede ver y modificar SUS PROPIOS gastos de
-- viaje. Mismo patrón exacto que las tablas "viajes" y "categorias_viaje"
-- (ver supabase_viajes.sql y supabase_categorias_viaje.sql).
-- ============================================================================

alter table public.gastos_viaje enable row level security;

-- Solo puede LEER sus propios gastos de viaje.
drop policy if exists seleccionar_propio_gastos_viaje on public.gastos_viaje;
create policy seleccionar_propio_gastos_viaje
  on public.gastos_viaje
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Solo puede INSERTAR gastos cuyo user_id sea el suyo (no puede crear un
-- gasto "a nombre de" otro usuario).
drop policy if exists insertar_propio_gastos_viaje on public.gastos_viaje;
create policy insertar_propio_gastos_viaje
  on public.gastos_viaje
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Solo puede ACTUALIZAR sus propios gastos de viaje, y el resultado de la
-- actualización debe seguir siendo suyo (no puede cambiarle el user_id a
-- otro usuario).
drop policy if exists actualizar_propio_gastos_viaje on public.gastos_viaje;
create policy actualizar_propio_gastos_viaje
  on public.gastos_viaje
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Solo puede BORRAR sus propios gastos de viaje.
drop policy if exists eliminar_propio_gastos_viaje on public.gastos_viaje;
create policy eliminar_propio_gastos_viaje
  on public.gastos_viaje
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
-- "gastos_viaje".
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.gastos_viaje
  to authenticated;


-- ============================================================================
-- Fin del script.
--
-- Qué probar después de correr esto (en el SQL Editor de Supabase, o luego
-- desde la app una vez esté el código de la Fase 3):
--   1. Con un usuario logueado (A) que ya tenga un viaje y una categoría de
--      prueba, insertar un gasto de prueba:
--      insert into public.gastos_viaje (user_id, viaje_id, categoria_viaje_id, fecha, monto, moneda, descripcion)
--      values (auth.uid(), '<id-del-viaje-de-A>', '<id-de-categoria-de-A>', current_date, 25, 'USD', 'Taxi al aeropuerto');
--      Debe insertarse sin error de "permission denied" ni de política.
--   2. select * from public.gastos_viaje where viaje_id = '<id-del-viaje-de-A>';
--      (como usuario A) debe mostrar solo ese gasto.
--   3. Con un usuario distinto (B), esa misma consulta NO debe mostrar el
--      gasto de A.
--   4. Si quieres borrar la fila de prueba: delete from public.gastos_viaje
--      where descripcion = 'Taxi al aeropuerto';
-- ============================================================================
