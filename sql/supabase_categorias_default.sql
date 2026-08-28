-- ============================================================================
-- supabase_categorias_default.sql
--
-- ❌ OBSOLETO — NO EJECUTAR. Esta versión de handle_new_user() NUNCA quedó
-- activa en producción: se confirmó contra el trigger REAL de Supabase que
-- el que estaba vivo seguía siendo el viejo (el de supabase_consentimientos.sql)
-- hasta que supabase_fix_trigger_categorias.sql (2026-08-27) lo corrigió.
-- El contenido útil de este script (lista nueva de 6 categorías, columna
-- "es_sistema", nombres es/en) fue absorbido por
-- supabase_fix_trigger_categorias.sql, que es el vigente. Las columnas
-- "categorias.es_sistema" y "categorias.descripcion" sí existen hoy (las
-- re-crea aquel script con "add column if not exists"). Se conserva este
-- archivo solo como historial. Ver sql/README.md (paso 11).
--
-- Redefine la lista de CATEGORÍAS POR DEFECTO que el trigger handle_new_user()
-- crea cuando un usuario se registra, y hace que nazcan en el idioma que el
-- usuario eligió en el registro (es/en, columna "perfiles.idioma", que ya
-- viaja en raw_user_meta_data ->> 'idioma' desde supabase_idioma_perfiles.sql).
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Agrega la columna "descripcion" (opcional) a la tabla "categorias" ya
--      existente, para poder guardar el texto de ayuda de "Gastos hormiga".
--   2. Agrega la columna "es_sistema" (boolean) a "categorias": marca las
--      categorías especiales que la app protege (hoy solo "Gastos fijos" /
--      "Fixed expenses"), SIN depender del nombre ni del idioma.
--   3. Reemplaza handle_new_user() para que inserte la NUEVA lista de 6
--      categorías, con nombre/descripción en español o inglés según el
--      idioma elegido, y marcando es_sistema = true solo en la de gastos
--      fijos. El resto del trigger (moneda, idioma, fondo de emergencia)
--      queda exactamente igual que en supabase_idioma_perfiles.sql.
--   4. Migra a los usuarios que YA existen: marca es_sistema = true en sus
--      categorías que hoy se llaman 'Gastos fijos' o 'Fixed expenses', para
--      que también queden bien marcadas.
--
-- NUEVA lista de categorías por defecto (es / en):
--   1. Mercado / Groceries              🛒  #4fd1a5 (verde — igual que antes)
--   2. Ocio / Leisure                   🎬  #e9b949 (dorado — igual que antes)
--   3. Gastos hormiga / Small daily...  🐜  #e07ba0 (rosado — antes era el
--      color de "Varios", que desaparece de la lista; se reasigna aquí
--      porque el espíritu es el mismo: gastos pequeños y variados)
--   4. Transporte / Transport           🚌  #9b8cf0 (morado — ya se usaba
--      para "Transporte" en el trigger anterior, ahora con el emoji correcto
--      de bus en vez del de gasolina)
--   5. Gasolina / Fuel                  ⛽  #f2795b (naranja — color que ya
--      existe en la paleta de la app, libre porque antes no había una
--      categoría de Gasolina separada de Transporte en este trigger)
--   6. Gastos fijos / Fixed expenses    📌  #9db0a6 (gris verdoso — SIN
--      cambios de color; ahora además es_sistema = true)
--
-- Nota sobre "Salud" y "Varios": salen de la lista por defecto (así lo pidió
-- el nuevo listado). Sus colores (#5aa9e6 azul y #e07ba0 rosado) quedan
-- libres; #e07ba0 se reutiliza para "Gastos hormiga" como se explica arriba.
--
-- ¿QUÉ CAMBIÓ respecto a la primera versión de este script? Antes, la
-- categoría de gastos fijos se identificaba SOLO por su nombre exacto en
-- español ('Gastos fijos'), lo cual se rompía para usuarios en inglés
-- ('Fixed expenses'). Ahora hay una columna es_sistema (boolean) que marca
-- esa categoría sin importar el idioma ni el nombre — el nombre por nombre
-- solo se usa UNA VEZ, en el PASO 4, para migrar (marcar) a los usuarios que
-- ya existen; de ahí en adelante todo se basa en es_sistema.
--
-- ⚠️  IMPORTANTE — el código de la app TODAVÍA compara por nombre:
--     App.jsx, GestionCategorias.jsx, Resumen.jsx y GastosVariables.jsx hoy
--     identifican la categoría protegida comparando nombre === 'Gastos
--     fijos'. Este script deja lista la columna es_sistema y la marca
--     correctamente en la base de datos, pero el CÓDIGO todavía no la usa.
--     Mientras no se actualice ese código (paso siguiente, aparte), la app
--     seguirá funcionando igual que hasta ahora (por nombre), y un usuario
--     en inglés con "Fixed expenses" seguiría sin ser reconocido como
--     categoría de sistema por la app. Ver el recordatorio al final.
--
-- ⚠️  IMPORTANTE — usuarios que YA existen:
--     Este script NO borra ni edita nombres, emojis, colores, presupuestos
--     ni gastado de ninguna categoría existente. El único cambio para datos
--     ya existentes es el UPDATE del PASO 4, que SOLO pone es_sistema = true
--     en las categorías que ya se llaman 'Gastos fijos' o 'Fixed expenses'
--     (una bandera nueva, no borra nada). Todas las demás categorías de
--     usuarios existentes (Mercado, Transporte, Salud, Ocio, Varios, o lo
--     que hayan editado) se quedan intactas, con es_sistema = false. La
--     nueva LISTA de categorías por defecto solo aplica a usuarios que se
--     registren DESPUÉS de correr este script.
--
-- Seguro de ejecutar más de una vez: "add column if not exists", la función
-- usa "create or replace", y el UPDATE del PASO 4 es idempotente (si ya
-- estaba en true, lo vuelve a dejar en true, no hay efecto acumulativo). No
-- hay DROP TABLE ni DELETE de datos.
-- ============================================================================


-- ============================================================================
-- PASO 1: Columna "descripcion" en la tabla "categorias" ya existente
-- ============================================================================
-- Texto de ayuda opcional para una categoría (por ahora solo lo usa "Gastos
-- hormiga"). Nullable a propósito: las demás categorías, y cualquier
-- categoría creada a mano por un usuario, simplemente no tienen descripción.
alter table public.categorias
  add column if not exists descripcion text;


-- ============================================================================
-- PASO 2: Columna "es_sistema" en la tabla "categorias" ya existente
-- ============================================================================
-- Bandera que marca las categorías especiales del sistema (no editables ni
-- borrables desde la app). "not null default false": todas las categorías,
-- existentes o nuevas, son normales a menos que se marquen explícitamente.
-- Esto reemplaza la comparación frágil por nombre ('Gastos fijos') que
-- dejaba de funcionar en inglés ('Fixed expenses').
alter table public.categorias
  add column if not exists es_sistema boolean not null default false;


-- ============================================================================
-- PASO 3: Reemplazar handle_new_user() con la nueva lista de categorías
-- ============================================================================
-- Mismo trigger de siempre (moneda + idioma + fondo de emergencia, igual que
-- en supabase_idioma_perfiles.sql). Lo que cambia es QUÉ categorías se
-- insertan: nombre/emoji/color/descripción según "idioma_elegido" (mismo
-- respaldo de siempre: si no viene o es inválido, se usa español), y la
-- categoría de gastos fijos ahora se inserta con es_sistema = true — las
-- otras cinco quedan en false (el default de la columna).
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

-- El trigger en sí no cambia (sigue apuntando a la misma función), pero se
-- deja el "drop + create" para que este bloque sea copiable/ejecutable
-- solo, igual que en los scripts anteriores.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================================
-- PASO 4: Migrar a los usuarios que YA existen — marcar es_sistema = true
-- ============================================================================
-- Esta es la ÚNICA vez que comparamos por nombre en todo el script, y es a
-- propósito: es el puente para pasar de "identificar por nombre" a
-- "identificar por es_sistema" sin perder la marca en las categorías que ya
-- existen. No borra ni cambia nombre/emoji/color/presupuesto/gastado de
-- nada — solo prende la bandera es_sistema en las filas que ya se llaman
-- 'Gastos fijos' (español) o 'Fixed expenses' (inglés, por si ya hay alguna
-- de una prueba previa). Es seguro correrlo varias veces: si ya estaba en
-- true, lo deja en true.
update public.categorias
set es_sistema = true
where nombre in ('Gastos fijos', 'Fixed expenses')
  and es_sistema is distinct from true;


-- ============================================================================
-- Fin del script (OBSOLETO — ver encabezado; reemplazado por
-- supabase_fix_trigger_categorias.sql).
--
-- PASO DE CÓDIGO que acompañó a este cambio (ya hecho en la app):
--   1. Mostrar el texto de "descripcion" en la interfaz donde se vean las
--      categorías (por ahora solo lo tendrá "Gastos hormiga").
--   2. Traducir las pantallas que ya usan los nombres de categoría en
--      español (i18n de la app).
--   3. Actualizar App.jsx, GestionCategorias.jsx, Resumen.jsx y
--      GastosVariables.jsx para que dejen de comparar nombre === 'Gastos
--      fijos', y en su lugar reconozcan la categoría protegida del sistema
--      con es_sistema === true (funciona igual sin importar el idioma).
-- ============================================================================
