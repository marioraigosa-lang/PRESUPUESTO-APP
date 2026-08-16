-- ============================================================================
-- supabase_cambios_metas.sql
--
-- Prepara la base de datos para dos funciones nuevas de Saldo App:
--   1. Marcar qué cuentas cuentan como "ahorro" (columna es_ahorro en "cuentas").
--   2. Guardar metas de ahorro personales (tabla nueva "metas_ahorro").
--
-- Este script es seguro de ejecutar más de una vez: usa "if not exists" en
-- todas las partes que crean estructura, y un chequeo antes del INSERT de
-- ejemplo para no duplicarlo si lo corres varias veces.
--
-- No borra ni modifica datos existentes (no hay DROP TABLE ni DELETE).
-- ============================================================================

-- ============================================================================
-- 1) Columna nueva en "cuentas": es_ahorro
-- ============================================================================

-- Agrega la columna solo si todavía no existe. "not null default false" hace
-- que, al crearla, TODAS las cuentas existentes queden automáticamente en
-- false (no hace falta ponerlo a mano).
alter table public.cuentas
  add column if not exists es_ahorro boolean not null default false;

-- Marca como ahorro/inversión las cuentas que corresponden. Las demás ya
-- quedaron en false por el default de arriba, así que no hace falta tocarlas.
update public.cuentas
  set es_ahorro = true
  where nombre in ('CDT Occidente', 'Trii');

-- ============================================================================
-- 2) Tabla nueva: metas_ahorro
-- ============================================================================

-- Asegura que exista la extensión para generar uuid automáticos (ya debería
-- estar creada desde supabase_setup.sql, pero por si este script se corre
-- solo, lo dejamos aquí también).
create extension if not exists pgcrypto;

create table if not exists public.metas_ahorro (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  monto_objetivo numeric(14, 2) not null,
  anio integer not null,
  creado_en timestamptz not null default now()
);

-- Fila de ejemplo. El "where not exists" evita insertarla duplicada si
-- vuelves a correr este script.
insert into public.metas_ahorro (nombre, monto_objetivo, anio)
select 'Meta de ahorro 2026', 10000000, 2026
where not exists (
  select 1 from public.metas_ahorro
  where nombre = 'Meta de ahorro 2026' and anio = 2026
);

-- ============================================================================
-- 3) Permisos de desarrollo para "metas_ahorro" (rol anon)
--
-- ⚠️  SOLO PARA DESARROLLO — igual que supabase_permisos_dev.sql
--
-- La tabla "cuentas" no necesita permisos nuevos: el GRANT que ya tiene
-- (hecho en supabase_permisos_dev.sql) cubre la tabla completa, columnas
-- nuevas incluidas. Pero "metas_ahorro" es una tabla nueva y necesita su
-- propio GRANT y su propia política, o dará el mismo error de "permission
-- denied" que tuvimos al principio con las otras tablas.
-- ============================================================================

grant usage on schema public to anon;

grant select, insert, update, delete
  on table public.metas_ahorro
  to anon;

alter table public.metas_ahorro enable row level security;

drop policy if exists dev_allow_all_metas_ahorro on public.metas_ahorro;
create policy dev_allow_all_metas_ahorro
  on public.metas_ahorro
  for all
  to anon
  using (true)
  with check (true);

-- ============================================================================
-- Fin del script.
-- Recuerda: antes de publicar la app con usuarios reales, reemplaza la
-- política "dev_allow_all_metas_ahorro" por una real basada en auth.uid(),
-- igual que se documentó en supabase_permisos_dev.sql.
-- ============================================================================
