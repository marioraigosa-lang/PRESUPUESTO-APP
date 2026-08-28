-- ============================================================================
-- supabase_fix_trigger_categorias.sql
--
-- ✅ APLICADO EN PRODUCCIÓN el 2026-08-27. Esta es la versión VIGENTE y
-- correcta del trigger handle_new_user(): reemplazó la versión rota que
-- había quedado de sql/supabase_consentimientos.sql (INSERT de categorías
-- con 4 columnas, sin "es_sistema" ni "descripcion", lista de categorías
-- antigua). No hace falta volver a ejecutarlo. Ver sql/README.md (paso 21).
--
-- POR QUÉ EXISTE ESTE SCRIPT:
--   Se confirmó con el trigger REAL de la base de datos (consultado en
--   Supabase) que la versión de handle_new_user() que quedó activa es la de
--   sql/supabase_consentimientos.sql: el INSERT de categorías ahí tiene solo
--   4 columnas (user_id, nombre, emoji, color), SIN "es_sistema" ni
--   "descripcion", y usa la lista VIEJA de categorías (Mercado, Transporte,
--   Salud, Ocio, Varios, Gastos fijos). Es decir: las versiones de
--   sql/supabase_categorias_default.sql y sql/supabase_reparar_usuarios.sql
--   (que sí traían el INSERT correcto de 6 columnas) NUNCA se aplicaron de
--   verdad en el proyecto real, a pesar de que sql/README.md las daba por
--   ejecutadas.
--
--   Consecuencia concreta: toda cuenta creada con el trigger roto nace con
--   "Gastos fijos" en es_sistema = false, y eso rompe marcar gastos fijos
--   como pagados (el código que depende de es_sistema no encuentra la
--   categoría de sistema).
--
-- QUÉ HACE ESTE SCRIPT, EN 2 PARTES:
--   PARTE 1 -- dejar handle_new_user() en una versión que combina lo mejor
--     de las dos ramas que hoy están sueltas en el repo:
--       - el INSERT de categorías CORRECTO (6 columnas, es_sistema, lista
--         nueva, es/en) de supabase_categorias_default.sql /
--         supabase_reparar_usuarios.sql.
--       - el bloque de consentimientos (Ley 1581) de
--         supabase_consentimientos.sql, que SÍ está activo y funcionando
--         hoy -- se deja intacto, no se toca ni una línea.
--       - fondo_emergencia y perfiles (moneda/idioma), que tampoco cambian.
--     Esto es solo para cuentas NUEVAS de aquí en adelante.
--   PARTE 2 -- backfill: reparar las cuentas YA creadas con el trigger roto,
--     marcando es_sistema = true en su categoría "Gastos fijos" / "Fixed
--     expenses". NO toca nombre, emoji, color, presupuesto, gastado, ni
--     ninguna otra categoría -- y NO actualiza la lista de categorías vieja
--     a la nueva (ver el análisis de riesgo más abajo).
--
-- VERIFICACIÓN DE COLUMNAS -- "es_sistema" y "descripcion" en "categorias":
--   Ambas se agregaron en sql/supabase_categorias_default.sql (PASO 1 y
--   PASO 2), con "add column if not exists". La Parte 1 de este script las
--   vuelve a declarar así (inofensivo si ya existen, y es la red de
--   seguridad si por algún motivo tampoco llegaron a crearse -- mismo caso
--   que el trigger). No hace falta confirmarlo a mano por fuera de este
--   script: si las columnas ya existen, el ALTER TABLE no hace nada; si no
--   existen, las crea antes de que el resto del script las necesite.
--
-- GARANTÍA DE SEGURIDAD -- esto es aditivo, NO destructivo:
--   - No hay ningún DELETE, TRUNCATE ni DROP TABLE en todo el script.
--   - La Parte 1 usa "create or replace function" + "drop trigger if
--     exists" / "create trigger": reemplaza la DEFINICIÓN del trigger, no
--     toca ninguna fila que ya exista en la base de datos.
--   - La Parte 2 tiene un único UPDATE, y solo cambia una columna boolean
--     (es_sistema) en filas que ya se llaman exactamente 'Gastos fijos' o
--     'Fixed expenses' -- nunca su nombre, emoji, color, presupuesto ni
--     gastado. Idempotente: correrlo varias veces da el mismo resultado.
--   - Antes del UPDATE hay una consulta de SOLO LECTURA para ver, antes de
--     tocar nada, exactamente qué filas se van a modificar.
-- ============================================================================


-- ============================================================================
-- PARTE 1: handle_new_user() -- INSERT de categorías correcto + consentimientos
-- ============================================================================

-- Por si las columnas no llegaron a crearse junto con el trigger roto
-- (mismo caso que el propio INSERT de categorías): inofensivo si ya existen.
alter table public.categorias
  add column if not exists descripcion text;

alter table public.categorias
  add column if not exists es_sistema boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  moneda_elegida   text;
  idioma_elegido   text;
  acepto_datos     text;
  version_politica text;
  acepto_terminos  text;
  version_terminos text;
  mayor_edad       text;
  version_edad     text;
begin
  moneda_elegida := new.raw_user_meta_data ->> 'moneda';
  if moneda_elegida is null or moneda_elegida not in ('COP', 'USD', 'EUR') then
    moneda_elegida := 'COP';
  end if;

  idioma_elegido := new.raw_user_meta_data ->> 'idioma';
  if idioma_elegido is null or idioma_elegido not in ('es', 'en') then
    idioma_elegido := 'es';
  end if;

  -- Categorías por defecto: lista nueva, 6 columnas, es_sistema = true SOLO
  -- en "Gastos fijos" / "Fixed expenses" (igual que
  -- supabase_categorias_default.sql / supabase_reparar_usuarios.sql).
  if idioma_elegido = 'en' then
    insert into public.categorias (user_id, nombre, emoji, color, descripcion, es_sistema) values
      (new.id, 'Groceries',            '🛒', '#4fd1a5', null, false),
      (new.id, 'Leisure',              '🎬', '#e9b949', null, false),
      (new.id, 'Small daily expenses', '🐜', '#e07ba0',
        'Small daily expenses that add up without noticing (coffee, snacks, tips...)', false),
      (new.id, 'Transport',            '🚌', '#9b8cf0', null, false),
      (new.id, 'Fuel',                 '⛽', '#f2795b', null, false),
      (new.id, 'Fixed expenses',       '📌', '#9db0a6', null, true);
  else
    insert into public.categorias (user_id, nombre, emoji, color, descripcion, es_sistema) values
      (new.id, 'Mercado',         '🛒', '#4fd1a5', null, false),
      (new.id, 'Ocio',            '🎬', '#e9b949', null, false),
      (new.id, 'Gastos hormiga',  '🐜', '#e07ba0',
        'Pequeños gastos diarios que suman sin darte cuenta (café, snacks, propinas...)', false),
      (new.id, 'Transporte',      '🚌', '#9b8cf0', null, false),
      (new.id, 'Gasolina',        '⛽', '#f2795b', null, false),
      (new.id, 'Gastos fijos',    '📌', '#9db0a6', null, true);
  end if;

  insert into public.fondo_emergencia (user_id, monto_actual, meses_meta)
  values (new.id, 0, 6);

  insert into public.perfiles (user_id, moneda, idioma)
  values (new.id, moneda_elegida, idioma_elegido);

  -- Constancia de consentimiento (Ley 1581) -- INTACTO, igual que en
  -- supabase_consentimientos.sql: solo se inserta cada fila si el metadato
  -- vino explícitamente en "true" y trae una versión no vacía.
  acepto_datos     := new.raw_user_meta_data ->> 'aceptoDatos';
  version_politica := new.raw_user_meta_data ->> 'versionPolitica';
  if acepto_datos = 'true' and coalesce(version_politica, '') <> '' then
    insert into public.consentimientos (user_id, tipo, version)
    values (new.id, 'politica_datos', version_politica);
  end if;

  acepto_terminos  := new.raw_user_meta_data ->> 'aceptoTerminos';
  version_terminos := new.raw_user_meta_data ->> 'versionTerminos';
  if acepto_terminos = 'true' and coalesce(version_terminos, '') <> '' then
    insert into public.consentimientos (user_id, tipo, version)
    values (new.id, 'terminos_uso', version_terminos);
  end if;

  mayor_edad   := new.raw_user_meta_data ->> 'mayorEdad';
  version_edad := new.raw_user_meta_data ->> 'versionMayorEdad';
  if mayor_edad = 'true' and coalesce(version_edad, '') <> '' then
    insert into public.consentimientos (user_id, tipo, version)
    values (new.id, 'mayor_edad', version_edad);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================================
-- PARTE 2: Backfill -- reparar cuentas ya creadas con el trigger roto
-- ============================================================================

-- --------------------------------------------------------------------------
-- 2a) SOLO LECTURA -- revisar ANTES de tocar nada qué filas se van a marcar
-- --------------------------------------------------------------------------
-- Corre esto primero y mira el resultado: cada fila de aquí es una categoría
-- que hoy tiene es_sistema = false y se va a poner en true. Si algo se ve
-- raro (por ejemplo, un usuario con MÁS de una fila 'Gastos fijos'), avisa
-- antes de seguir.
select user_id, id, nombre, emoji, color, es_sistema
from public.categorias
where nombre in ('Gastos fijos', 'Fixed expenses')
  and es_sistema = false;

-- --------------------------------------------------------------------------
-- 2b) UPDATE -- marcar es_sistema = true en las que ya se llaman así
-- --------------------------------------------------------------------------
-- Mismo UPDATE, ya probado, de supabase_categorias_default.sql (PASO 4) y
-- supabase_reparar_usuarios.sql (2c-i). Solo cambia la bandera boolean; no
-- toca nombre, emoji, color, presupuesto ni gastado. No cambia la lista de
-- categorías vieja (Salud/Varios) por la nueva (Gastos hormiga/Gasolina) de
-- NINGUNA cuenta existente -- eso sería editar datos que el usuario pudo
-- haber modificado o que ya tienen movimientos asociados, y queda fuera de
-- este arreglo a propósito. Solo el trigger de la Parte 1 usa la lista
-- nueva, y solo para cuentas que se creen de aquí en adelante.
update public.categorias
set es_sistema = true
where nombre in ('Gastos fijos', 'Fixed expenses')
  and es_sistema = false;


-- ============================================================================
-- Fin del script.
--
-- Después de correr esto en Supabase:
--   - Toda cuenta NUEVA nace con categorías correctas (es_sistema, lista
--     actualizada, es/en), fondo de emergencia, perfil y consentimientos.
--   - Toda cuenta EXISTENTE que tenía "Gastos fijos" / "Fixed expenses" sin
--     marcar queda con es_sistema = true, sin que se le haya tocado ningún
--     otro dato.
--   - Puedes confirmar el resultado con sql/supabase_verificar_trigger.sql.
-- ============================================================================
