-- ============================================================================
-- supabase_reparar_usuarios.sql
--
-- ❌ OBSOLETO — NO EJECUTAR. Reemplazado por
-- supabase_fix_trigger_categorias.sql (aplicado 2026-08-27), que hace este
-- mismo trabajo (dejar handle_new_user() correcto + backfill de es_sistema)
-- con un diagnóstico más preciso: se confirmó la definición del trigger
-- REAL en Supabase antes de escribirlo. Este script nunca se aplicó. Se
-- conserva solo como historial. Ver sql/README.md ("Scripts fuera del
-- historial numerado").
--
-- POR QUÉ EXISTE ESTE SCRIPT:
--   sql/supabase_categorias_default.sql ya deja handle_new_user() completo y
--   correcto para CUALQUIER usuario que se registre de ahora en adelante.
--   Pero varios de los scripts que construyeron esa versión final
--   (supabase_idioma_perfiles.sql, supabase_categorias_default.sql) traen en
--   su propio encabezado el aviso "BORRADOR -- NO EJECUTAR TODAVÍA", y
--   supabase_guia_vista.sql está marcado "pendiente de ejecutar -- en
--   revisión". No hay certeza de que las 4 versiones intermedias del
--   trigger se hayan aplicado en orden en el proyecto real de Supabase --
--   y si un usuario se registró ENTRE una versión y otra, nació con una
--   versión incompleta (por ejemplo, sin es_sistema, o sin fila de
--   perfiles). Ese es justamente el tipo de inconsistencia que tenía la
--   cuenta vieja.
--
-- QUÉ HACE ESTE SCRIPT, EN 2 PARTES:
--   PARTE 1 -- deja handle_new_user() en su versión final y completa (igual
--     que supabase_categorias_default.sql), para que de ahora en adelante
--     TODO usuario nuevo nazca completo, sin importar qué versión estaba
--     activa antes.
--   PARTE 2 -- repara (backfill) a los usuarios que YA existen y a los que
--     les falte algo, agregando SOLO lo que falta.
--
-- GARANTÍA DE SEGURIDAD -- esto es aditivo, NO destructivo:
--   - No hay ningún DELETE, ningún TRUNCATE, ningún DROP TABLE en todo este
--     script.
--   - No se toca el nombre, emoji, color, presupuesto, gastado ni
--     descripción de NINGUNA categoría que el usuario ya tenga. Tampoco se
--     tocan cuentas, movimientos, gastos_fijos, metas_ahorro ni viajes.
--   - Cada INSERT usa "WHERE NOT EXISTS" / "LEFT JOIN ... WHERE ... IS NULL"
--     para crear una fila SOLO si de verdad no existe -- correrlo 2, 3 o 10
--     veces produce el mismo resultado que correrlo 1 vez (idempotente).
--   - El único UPDATE de todo el script (parte 2c-i) solo prende una
--     bandera boolean (es_sistema) en categorías que YA se llaman 'Gastos
--     fijos' / 'Fixed expenses' -- es exactamente el mismo UPDATE que ya
--     trae supabase_categorias_default.sql en su PASO 4, repetido aquí para
--     que este script sea autosuficiente y no dependas de si aquel ya
--     corrió o no.
-- ============================================================================


-- ============================================================================
-- PARTE 0: Asegurar que existan las columnas que la función necesita
-- ============================================================================
-- Por si alguno de los scripts "borrador" nunca llegó a correr en el
-- proyecto real: estas 4 columnas ya deberían existir (vienen de
-- supabase_idioma_perfiles.sql, supabase_guia_vista.sql y
-- supabase_categorias_default.sql), pero "add column if not exists" es
-- inofensivo si ya existen -- no falla, no las vuelve a crear, no borra
-- datos. Esto hace que este script funcione sin importar cuáles de esos
-- borradores ya se aplicaron.
alter table public.perfiles
  add column if not exists idioma text not null default 'es' check (idioma in ('es', 'en'));

alter table public.perfiles
  add column if not exists guia_vista boolean not null default false;

alter table public.categorias
  add column if not exists descripcion text;

alter table public.categorias
  add column if not exists es_sistema boolean not null default false;


-- ============================================================================
-- PARTE 1: handle_new_user() en su versión final y completa
-- ============================================================================
-- Idéntica a la de sql/supabase_categorias_default.sql: crea el perfil
-- (moneda + idioma; guia_vista queda en false por el DEFAULT de la columna,
-- no hace falta mencionarla acá), la fila de fondo_emergencia en cero, y las
-- 6 categorías por defecto en el idioma elegido, con "Gastos fijos"/"Fixed
-- expenses" marcada es_sistema = true.
--
-- "create or replace" + "drop trigger if exists" antes de recrearlo: se
-- puede correr este bloque cualquier cantidad de veces sin error, y deja el
-- trigger apuntando siempre a esta misma versión de la función.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  moneda_elegida text;
  idioma_elegido text;
begin
  moneda_elegida := new.raw_user_meta_data ->> 'moneda';
  if moneda_elegida is null or moneda_elegida not in ('COP', 'USD', 'EUR') then
    moneda_elegida := 'COP';
  end if;

  idioma_elegido := new.raw_user_meta_data ->> 'idioma';
  if idioma_elegido is null or idioma_elegido not in ('es', 'en') then
    idioma_elegido := 'es';
  end if;

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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================================
-- PARTE 2: Reparar (backfill) a los usuarios que YA existen
-- ============================================================================
-- Todo lo de aquí abajo es para cuentas creadas ANTES de que el trigger de
-- la Parte 1 quedara activo. El trigger nuevo no corre retroactivamente,
-- así que esto hace a mano, solo para lo que falte, lo mismo que el trigger
-- hace automáticamente para los usuarios nuevos.

-- --------------------------------------------------------------------------
-- 2a) fondo_emergencia: crear la fila SOLO a quien no tenga ninguna
-- --------------------------------------------------------------------------
-- LEFT JOIN + "IS NULL": selecciona únicamente los usuarios de auth.users
-- que no tienen ninguna fila propia en fondo_emergencia. A quien ya tiene
-- una (con el monto que sea, incluso si ya la modificó) no se le toca nada.
insert into public.fondo_emergencia (user_id, monto_actual, meses_meta)
select u.id, 0, 6
from auth.users u
left join public.fondo_emergencia f on f.user_id = u.id
where f.user_id is null;


-- --------------------------------------------------------------------------
-- 2b) perfiles: crear la fila SOLO a quien no tenga ninguna
-- --------------------------------------------------------------------------
-- Mismo patrón. Para un perfil que se crea aquí (usuario viejo, nunca eligió
-- moneda/idioma en un formulario de registro que en su momento no existía)
-- se usan los valores de respaldo: 'COP', 'es', y guia_vista = true --
-- true a propósito, para que a un usuario que ya venía usando la app no le
-- aparezca de sorpresa la guía de bienvenida (mismo criterio que ya usa el
-- backfill de supabase_guia_vista.sql para los perfiles que sí existían).
-- A quien YA tiene fila de perfiles -- aunque le falte algún dato -- no se
-- le pisa nada aquí; este script no hace ningún UPDATE sobre perfiles.
insert into public.perfiles (user_id, moneda, idioma, guia_vista)
select u.id, 'COP', 'es', true
from auth.users u
left join public.perfiles p on p.user_id = u.id
where p.user_id is null;


-- --------------------------------------------------------------------------
-- 2c-i) categorías: marcar es_sistema = true en las que ya se llaman
--       'Gastos fijos' / 'Fixed expenses' pero todavía no están marcadas
-- --------------------------------------------------------------------------
-- Repite el PASO 4 de supabase_categorias_default.sql (es igual de seguro
-- correrlo de nuevo: "es distinct from true" hace que solo toque filas que
-- de verdad lo necesitan). Solo cambia una bandera boolean -- no toca
-- nombre, emoji, color, presupuesto ni gastado.
update public.categorias
set es_sistema = true
where nombre in ('Gastos fijos', 'Fixed expenses')
  and es_sistema is distinct from true;

-- --------------------------------------------------------------------------
-- 2c-ii) categorías: crear la de gastos fijos SOLO a quien, después de
--        2c-i, se quede sin NINGUNA categoría es_sistema = true
-- --------------------------------------------------------------------------
-- Cubre el caso de un usuario que nunca tuvo una categoría de gastos fijos
-- para empezar (por ejemplo, si la borró, o si nació con una versión del
-- trigger anterior a que esa categoría existiera). "WHERE NOT EXISTS"
-- confirma, para cada usuario, que no haya quedado ya ninguna fila
-- es_sistema = true (ni la de 2c-i ni ninguna otra) antes de crear una
-- nueva -- así nunca termina con dos categorías de sistema.
-- El nombre se elige según perfiles.idioma (ya garantizado por 2b arriba);
-- si por algún motivo el perfil no existiera, COALESCE cae a español.
insert into public.categorias (user_id, nombre, emoji, color, descripcion, es_sistema)
select
  u.id,
  case when coalesce(p.idioma, 'es') = 'en' then 'Fixed expenses' else 'Gastos fijos' end,
  '📌',
  '#9db0a6',
  null,
  true
from auth.users u
left join public.perfiles p on p.user_id = u.id
where not exists (
  select 1
  from public.categorias c
  where c.user_id = u.id
    and c.es_sistema = true
);


-- ============================================================================
-- Fin del script.
--
-- Después de correr esto en Supabase:
--   - Todo usuario NUEVO nace completo automáticamente (Parte 1).
--   - Todo usuario EXISTENTE (incluida cualquier cuenta vieja que hayas
--     dejado abierta) queda con perfil, fondo de emergencia, y exactamente
--     una categoría es_sistema = true -- sin que se haya tocado ni un dato
--     que ya tuviera.
--   - Puedes confirmar el resultado con sql/supabase_verificar_trigger.sql.
-- ============================================================================
