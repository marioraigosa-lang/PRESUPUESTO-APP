-- ============================================================================
-- supabase_backfill_iconos.sql
--
-- [BORRADOR] -- NO EJECUTADO TODAVIA. Revisar con lupa antes de correr en
-- Supabase -> SQL Editor (este script TOCA el trigger handle_new_user, que ya
-- causo un incidente real -- ver sql/supabase_fix_trigger_categorias.sql).
-- Cuando se confirme que corrio, marcar como aplicado aca y en
-- sql/README.md, anotando con que consultas se verifico.
--
-- ============================================================================
-- HISTORIAL DE ESTE BORRADOR -- por que compara por HEX y no por el emoji literal
-- ============================================================================
-- La primera version de este script (2026-09-11) comparaba con
-- "CASE emoji WHEN '🛒' THEN ...", con el emoji tipeado literal en el SQL.
-- El dry-run del BLOQUE 0 revelo que la mayoria de las filas caian en el
-- fallback 'tag' en vez de su icono correcto (solo 🛒 y ⛽ matcheaban).
--
-- Diagnostico: se confirmo con
--   select nombre, emoji, encode(emoji::bytea, 'hex') as hex_utf8
--   from public.categorias;
-- que el "emoji" GUARDADO EN LA BASE DE DATOS es UTF-8 canonico, byte a byte
-- correcto (coincide con el hex esperado para cada emoji). El dato en Supabase
-- esta perfecto. El problema estaba en el ARCHIVO .sql: al escribir un CASE
-- con 74 literales de emoji repetidos varias veces (cada tabla necesita su
-- propio bloque), algunos de esos literales se corrompieron al generarse el
-- texto -- probablemente un artefacto de como se genero/transmitio el
-- contenido, no algo que se pueda prevenir tipeando "con mas cuidado" (ya se
-- habia descartado selector de variacion U+FE0F, ZWJ, y cualquier problema de
-- codificacion real: los codepoints en el archivo eran limpios, simplemente
-- ALGUNOS eran el emoji EQUIVOCADO).
--
-- Solucion: en vez de comparar el emoji literal, se compara
-- "encode(emoji::bytea, 'hex')" -- el hex UTF-8 -- contra un literal de HEX
-- (texto ASCII puro: 'f09f9b92', no 🛒). El hex es imposible de corromper por
-- este tipo de problema (son solo los caracteres 0-9a-f). Los valores de hex
-- de este script salen de una lectura programatica de
-- src/utils/mapaEmojiIcono.js (Buffer.from(emoji,'utf8').toString('hex') por
-- cada entrada de MAPA_CATEGORIA / MAPA_MOVIMIENTO), no de retipear emojis a
-- mano -- la misma fuente de verdad de siempre, solo que ahora el "canal" que
-- llega al archivo .sql es ASCII, no emoji. El emoji que aparece en cada linea
-- despues de "--" es solo un comentario para que un humano pueda leer el
-- script; no participa en ningun matching, asi que si alguno de esos
-- comentarios se ve mal no afecta el resultado del backfill en absoluto.
--
-- El trigger (BLOQUE 5) NO tenia este bug: ahi cada emoji aparece una sola
-- vez (no en un CASE de 74 ramas repetido), y se verifico -- extrayendo el
-- bloque del archivo con Node y comparando hex -- que sus 6 literales
-- ('🛒','🎬','🐜','🚌','⛽','📌') coinciden exactos con el hex canonico. No se
-- modifico.
--
-- SEGUNDA VUELTA (mismo dia): el dry-run por hex funciono para casi todo,
-- pero categorias_viaje trajo 2 filas en 'tag': '✈️' (hex en BD:
-- e29c88efb88f) y '🍽️' (hex en BD: f09f8dbdefb88f). El mapa de este script
-- tenia el hex SIN el sufijo ('e29c88', 'f09f8dbd'): esos 2 emojis, a
-- diferencia de los demas, SI traen el selector de variacion U+FE0F
-- (efb88f en UTF-8) pegado al final en la BD -- probablemente porque se
-- escribieron con un selector de emoji del sistema operativo (categorias de
-- viaje se cargan por texto libre, ver src/services/categoriasViaje.js /
-- HojaNuevaCategoriaViaje.jsx), mientras que los emojis sembrados por el
-- trigger nunca lo llevan. Esto es EXACTAMENTE lo que
-- src/utils/mapaEmojiIcono.js ya resuelve en JS con su funcion limpiar()
-- ("emoji.replace(/️/g, '')", donde el caracter entre las barras es el
-- propio U+FE0F): la comparacion en SQL tiene que hacer lo mismo.
--
-- Fix: el sujeto del CASE ya no es "encode(emoji::bytea, 'hex')" solo, sino
-- "regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '')" -- le quita el
-- 'efb88f' SOLO SI esta al final (ancla "$"), nunca en medio de la cadena.
-- Es seguro por construccion, no solo por casualidad: 0xEF (el primer byte
-- de la secuencia UTF-8 de FE0F) nunca puede ser un "continuation byte"
-- UTF-8 valido (esos van de 0x80 a 0xBF; 0xEF = 11101111 no entra en ese
-- rango) -- asi que 'efb88f' NUNCA puede aparecer como cola accidental de
-- OTRO caracter distinto a U+FE0F. Se confirmo ademas, por las dudas, contra
-- los 80 emojis de mapaEmojiIcono.js (MAPA_CATEGORIA + MAPA_MOVIMIENTO): a
-- ninguno le pasa esto. El dry-run de este BLOQUE 0 ahora trae una columna
-- extra "hex_normalizado" para que se vea el antes/despues.
--
-- ============================================================================
-- QUE RESUELVE
-- ============================================================================
-- Fase B3 del PLAN-iconos.md (raiz del repo): backfill de la columna "icono"
-- (agregada en Fase B1, sql/supabase_iconos_categorias.sql) para las filas
-- YA EXISTENTES de categorias / movimientos / categorias_viaje, y ajuste del
-- trigger handle_new_user() para que las categorias sembradas al registrarse
-- nazcan con "icono" tambien (no solo "emoji").
--
-- El mapeo emoji -> icono de este script sale de src/utils/mapaEmojiIcono.js
-- (MAPA_CATEGORIA / MAPA_MOVIMIENTO) -- fuente de verdad, con tests
-- (src/utils/mapaEmojiIcono.test.js) -- convertido a pares hex -> icono. Si
-- algun dia se agrega una rama alla, hay que regenerar los WHEN de este
-- script con el mismo procedimiento (leer el .js, calcular
-- Buffer.from(emoji,'utf8').toString('hex') por entrada) en vez de agregar la
-- linea a mano, para no reintroducir el bug de transcripcion.
--
-- ============================================================================
-- QUE HACE ESTE SCRIPT, EN ESTE ORDEN
-- ============================================================================
--   BLOQUE 0. (SOLO LECTURA) Verificar el trigger REAL antes de tocarlo, y
--             dry-run de los 3 backfills (que hex de emoji -> que icono,
--             cuantas filas). Correr esto PRIMERO y revisar la salida.
--   BLOQUE 1. Red de seguridad: "add column if not exists icono" en las 3
--             tablas (por si Fase B1 no llego a correr todavia -- inofensivo
--             si ya existen, mismo patron que supabase_fix_trigger_categorias.sql
--             con "descripcion"/"es_sistema").
--   BLOQUE 2. UPDATE categorias.icono (CASE por hex -> icono, WHERE icono IS NULL).
--   BLOQUE 3. UPDATE movimientos.icono (CASE extendido con los hex de emojis
--             de TIPO, WHERE icono IS NULL AND emoji IS NOT NULL).
--   BLOQUE 4. UPDATE categorias_viaje.icono (mismo CASE que categorias).
--   BLOQUE 5. create or replace de handle_new_user(): SOLO se le agrega la
--             columna "icono" (con su valor fijo) al INSERT de categorias por
--             defecto. Todo lo demas -- consentimientos, fondo_emergencia,
--             perfiles, moneda/idioma -- queda copiado literal, sin tocar.
--   VERIFICACION (comentada, al final): 0 filas con icono NULL donde habia
--   emoji; el trigger nuevo trae "icono" en su INSERT.
--
-- GARANTIA DE SEGURIDAD -- esto es aditivo/actualizador, NO destructivo:
--   - Ningun DELETE, TRUNCATE ni DROP TABLE en todo el script.
--   - Los 3 UPDATE solo escriben la columna "icono" y solo en filas donde hoy
--     es NULL ("WHERE icono IS NULL"): idempotente, no pisa un icono ya
--     asignado a mano (Fase B4, selector) ni corre dos veces con efecto
--     distinto.
--   - "emoji" NUNCA se toca (ni se lee para escribir, ni se borra). Sigue
--     siendo la fuente del mapeo y la red de rollback.
--   - El trigger se reemplaza con "create or replace function" (no se borra
--     la funcion); se preserva CADA linea del bloque de consentimientos,
--     fondo_emergencia y perfiles tal cual esta en la version vigente
--     (sql/supabase_fix_trigger_categorias.sql, aplicada 2026-08-27, ver
--     sql/README.md paso 21). Solo cambian las 2 listas de INSERT de
--     categorias (es/en), agregandoles la columna "icono".
-- ============================================================================


-- ============================================================================
-- BLOQUE 0: (SOLO LECTURA) verificar el trigger real + dry-run de los backfills
-- ============================================================================
-- ⚠️ CORRER ESTO PRIMERO, SOLO, Y REVISAR A MANO ANTES DE SEGUIR. No cambia
-- nada. sql/README.md (nota de buena practica) lo exige explicitamente para
-- cualquier script que toque handle_new_user(), despues del incidente de
-- 2026-08-27 (el README daba un trigger por aplicado y en realidad vivia otra
-- version en Supabase).

-- 0a) Definicion REAL, hoy, de handle_new_user() -- misma consulta que
--     sql/supabase_verificar_trigger.sql (paso 3). Compara el resultado con
--     el bloque "create or replace function" de
--     sql/supabase_fix_trigger_categorias.sql (PARTE 1): deben coincidir
--     linea por linea. Este script (BLOQUE 5, mas abajo) asume que coinciden
--     -- esta ASUMIENDO que nada volvio a tocar el trigger despues del
--     2026-08-27 (sql/README.md no registra ningun cambio posterior al paso
--     21). Si el resultado de esta consulta NO coincide con
--     supabase_fix_trigger_categorias.sql, PARAR: no correr el BLOQUE 5 de
--     este script sin antes ajustarlo a mano a lo que la base de datos tenga
--     realmente.
select pg_get_functiondef(oid) as definicion_actual
from pg_proc
where proname = 'handle_new_user';

-- 0b) Dry-run categorias: a que icono mapea el HEX de cada emoji hoy
--     presente, y cuantas filas toca (solo las que todavia no tienen icono).
--     "emoji" se muestra aparte solo para que lo leas vos -- el matching es
--     100% por el hex UTF-8 normalizado (sin el sufijo del selector de
--     variacion U+FE0F, si lo tiene), no por el emoji.
select
  emoji,
  encode(emoji::bytea, 'hex') as hex_utf8,
  regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '') as hex_normalizado,
  count(*) as categorias,
  case regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '')
    when 'f09f9b92' then 'shopping-cart'      -- 🛒
    when 'f09f8eac' then 'clapperboard'       -- 🎬
    when 'f09f8ea5' then 'clapperboard'       -- 🎥
    when 'f09f909c' then 'coffee'             -- 🐜
    when 'f09f9a8c' then 'bus'                -- 🚌
    when 'f09f9a97' then 'car'                -- 🚗
    when 'f09f9a95' then 'car-taxi-front'     -- 🚕
    when 'e29bbd'   then 'fuel'               -- ⛽
    when 'f09f938c' then 'pin'                -- 📌
    when 'f09f928a' then 'pill'               -- 💊
    when 'f09f8fa5' then 'stethoscope'        -- 🏥
    when 'f09f8fa0' then 'house'              -- 🏠
    when 'f09f8fa1' then 'house'              -- 🏡
    when 'f09f8d94' then 'utensils'           -- 🍔
    when 'f09f8dbd' then 'utensils'           -- 🍽
    when 'e29895'   then 'coffee'             -- ☕
    when 'f09f9195' then 'shirt'              -- 👕
    when 'f09f9b8d' then 'shopping-bag'       -- 🛍
    when 'f09f939a' then 'book-open'          -- 📚
    when 'f09f8e93' then 'graduation-cap'     -- 🎓
    when 'f09f90be' then 'paw-print'          -- 🐾
    when 'f09f8e81' then 'gift'               -- 🎁
    when 'e29c88'   then 'plane'              -- ✈
    when 'f09f8fa8' then 'hotel'              -- 🏨
    when 'f09f92a1' then 'zap'                -- 💡
    when 'f09f92b0' then 'piggy-bank'         -- 💰
    when 'f09f92b3' then 'credit-card'        -- 💳
    when 'f09f92b5' then 'banknote'           -- 💵
    when 'f09f8fa7' then 'banknote'           -- 🏧
    when 'e29ca8'   then 'sparkles'           -- ✨
    when 'f09f8eae' then 'gamepad-2'          -- 🎮
    when 'f09f8e9f' then 'ticket'             -- 🎟
    when 'f09f8db9' then 'wine'               -- 🍹
    when 'f09f8db7' then 'wine'               -- 🍷
    when 'f09f8dba' then 'beer'               -- 🍺
    when 'f09f8f96' then 'tree-palm'          -- 🏖
    when 'e29bb1'   then 'tree-palm'          -- ⛱
    when 'f09f93b7' then 'camera'             -- 📷
    when 'f09f8e92' then 'luggage'            -- 🎒
    when 'f09f8eb5' then 'music'              -- 🎵
    when 'f09f8ea7' then 'headphones'         -- 🎧
    when 'f09f8ea8' then 'palette'            -- 🎨
    when 'f09f92aa' then 'dumbbell'           -- 💪
    when 'f09f8f8b' then 'dumbbell'           -- 🏋
    when 'f09f9abf' then 'shower-head'        -- 🚿
    when 'f09f948c' then 'plug'               -- 🔌
    when 'f09f93b1' then 'phone'              -- 📱
    when 'f09f93b6' then 'wifi'               -- 📶
    when 'f09f9b8f' then 'bed'                -- 🛏
    when 'f09f9b8b' then 'sofa'               -- 🛋
    when 'f09f94a7' then 'wrench'             -- 🔧
    when 'f09f94a8' then 'hammer'             -- 🔨
    when 'f09f92bc' then 'briefcase'          -- 💼
    when 'f09f92bb' then 'laptop'             -- 💻
    when 'f09f8e82' then 'cake'               -- 🎂
    when 'f09f8d95' then 'pizza'              -- 🍕
    when 'f09f8d8e' then 'apple'              -- 🍎
    when 'f09f8d8f' then 'apple'              -- 🍏
    when 'f09f90b6' then 'dog'                -- 🐶
    when 'f09f90b1' then 'cat'                -- 🐱
    when 'e29da4'   then 'heart'              -- ❤
    when 'e2ad90'   then 'star'               -- ⭐
    when 'f09f8cb1' then 'sprout'             -- 🌱
    when 'f09f8c8d' then 'globe'              -- 🌍
    when 'e29bb0'   then 'mountain'           -- ⛰
    when 'f09f8f95' then 'tent'               -- 🏕
    when 'f09f97ba' then 'map'                -- 🗺
    when 'f09fa7ad' then 'compass'            -- 🧭
    when 'e29882'   then 'umbrella'           -- ☂
    when 'e29880'   then 'sun'                -- ☀
    when 'e29d84'   then 'snowflake'          -- ❄
    when 'f09f91a5' then 'users'              -- 👥
    when 'f09f91a4' then 'user'               -- 👤
    when 'f09f91b6' then 'baby'               -- 👶
    else 'tag'
  end as icono_destino
from public.categorias
where icono is null
group by emoji
order by categorias desc, emoji;

-- 0c) Dry-run movimientos (mismo CASE por hex + los hex de emojis de TIPO,
--     que tienen prioridad -- igual que mapaEmojiIconoMovimiento() en la app).
select
  emoji,
  encode(emoji::bytea, 'hex') as hex_utf8,
  regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '') as hex_normalizado,
  count(*) as movimientos,
  case regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '')
    -- emojis "de tipo" (movimientos.emoji copiado por construirDatosMovimiento
    -- / gastosFijos.js / HojaPagoTarjeta.jsx) -- SIEMPRE antes que los de
    -- categoria: solo '💰' difiere entre los dos mapas (alcancia vs ingreso).
    when 'f09f92b0' then 'arrow-down-left'    -- 💰
    when 'f09f9484' then 'arrow-left-right'   -- 🔄
    -- el resto: identico al CASE de categorias (BLOQUE 0b) porque
    -- movimientos.emoji tambien puede ser una copia del emoji de la
    -- categoria del gasto.
    when 'f09f9b92' then 'shopping-cart'      -- 🛒
    when 'f09f8eac' then 'clapperboard'       -- 🎬
    when 'f09f8ea5' then 'clapperboard'       -- 🎥
    when 'f09f909c' then 'coffee'             -- 🐜
    when 'f09f9a8c' then 'bus'                -- 🚌
    when 'f09f9a97' then 'car'                -- 🚗
    when 'f09f9a95' then 'car-taxi-front'     -- 🚕
    when 'e29bbd'   then 'fuel'               -- ⛽
    when 'f09f938c' then 'pin'                -- 📌
    when 'f09f928a' then 'pill'               -- 💊
    when 'f09f8fa5' then 'stethoscope'        -- 🏥
    when 'f09f8fa0' then 'house'              -- 🏠
    when 'f09f8fa1' then 'house'              -- 🏡
    when 'f09f8d94' then 'utensils'           -- 🍔
    when 'f09f8dbd' then 'utensils'           -- 🍽
    when 'e29895'   then 'coffee'             -- ☕
    when 'f09f9195' then 'shirt'              -- 👕
    when 'f09f9b8d' then 'shopping-bag'       -- 🛍
    when 'f09f939a' then 'book-open'          -- 📚
    when 'f09f8e93' then 'graduation-cap'     -- 🎓
    when 'f09f90be' then 'paw-print'          -- 🐾
    when 'f09f8e81' then 'gift'               -- 🎁
    when 'e29c88'   then 'plane'              -- ✈
    when 'f09f8fa8' then 'hotel'              -- 🏨
    when 'f09f92a1' then 'zap'                -- 💡
    when 'f09f92b3' then 'credit-card'        -- 💳
    when 'f09f92b5' then 'banknote'           -- 💵
    when 'f09f8fa7' then 'banknote'           -- 🏧
    when 'e29ca8'   then 'sparkles'           -- ✨
    when 'f09f8eae' then 'gamepad-2'          -- 🎮
    when 'f09f8e9f' then 'ticket'             -- 🎟
    when 'f09f8db9' then 'wine'               -- 🍹
    when 'f09f8db7' then 'wine'               -- 🍷
    when 'f09f8dba' then 'beer'               -- 🍺
    when 'f09f8f96' then 'tree-palm'          -- 🏖
    when 'e29bb1'   then 'tree-palm'          -- ⛱
    when 'f09f93b7' then 'camera'             -- 📷
    when 'f09f8e92' then 'luggage'            -- 🎒
    when 'f09f8eb5' then 'music'              -- 🎵
    when 'f09f8ea7' then 'headphones'         -- 🎧
    when 'f09f8ea8' then 'palette'            -- 🎨
    when 'f09f92aa' then 'dumbbell'           -- 💪
    when 'f09f8f8b' then 'dumbbell'           -- 🏋
    when 'f09f9abf' then 'shower-head'        -- 🚿
    when 'f09f948c' then 'plug'               -- 🔌
    when 'f09f93b1' then 'phone'              -- 📱
    when 'f09f93b6' then 'wifi'               -- 📶
    when 'f09f9b8f' then 'bed'                -- 🛏
    when 'f09f9b8b' then 'sofa'               -- 🛋
    when 'f09f94a7' then 'wrench'             -- 🔧
    when 'f09f94a8' then 'hammer'             -- 🔨
    when 'f09f92bc' then 'briefcase'          -- 💼
    when 'f09f92bb' then 'laptop'             -- 💻
    when 'f09f8e82' then 'cake'               -- 🎂
    when 'f09f8d95' then 'pizza'              -- 🍕
    when 'f09f8d8e' then 'apple'              -- 🍎
    when 'f09f8d8f' then 'apple'              -- 🍏
    when 'f09f90b6' then 'dog'                -- 🐶
    when 'f09f90b1' then 'cat'                -- 🐱
    when 'e29da4'   then 'heart'              -- ❤
    when 'e2ad90'   then 'star'               -- ⭐
    when 'f09f8cb1' then 'sprout'             -- 🌱
    when 'f09f8c8d' then 'globe'              -- 🌍
    when 'e29bb0'   then 'mountain'           -- ⛰
    when 'f09f8f95' then 'tent'               -- 🏕
    when 'f09f97ba' then 'map'                -- 🗺
    when 'f09fa7ad' then 'compass'            -- 🧭
    when 'e29882'   then 'umbrella'           -- ☂
    when 'e29880'   then 'sun'                -- ☀
    when 'e29d84'   then 'snowflake'          -- ❄
    when 'f09f91a5' then 'users'              -- 👥
    when 'f09f91a4' then 'user'               -- 👤
    when 'f09f91b6' then 'baby'               -- 👶
    else 'tag'
  end as icono_destino
from public.movimientos
where icono is null and emoji is not null
group by emoji
order by movimientos desc, emoji;

-- 0d) Dry-run categorias_viaje (mismo CASE que categorias -- BLOQUE 0b).
select
  emoji,
  encode(emoji::bytea, 'hex') as hex_utf8,
  regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '') as hex_normalizado,
  count(*) as categorias_viaje,
  case regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '')
    when 'f09f9b92' then 'shopping-cart'      -- 🛒
    when 'f09f8eac' then 'clapperboard'       -- 🎬
    when 'f09f8ea5' then 'clapperboard'       -- 🎥
    when 'f09f909c' then 'coffee'             -- 🐜
    when 'f09f9a8c' then 'bus'                -- 🚌
    when 'f09f9a97' then 'car'                -- 🚗
    when 'f09f9a95' then 'car-taxi-front'     -- 🚕
    when 'e29bbd'   then 'fuel'               -- ⛽
    when 'f09f938c' then 'pin'                -- 📌
    when 'f09f928a' then 'pill'               -- 💊
    when 'f09f8fa5' then 'stethoscope'        -- 🏥
    when 'f09f8fa0' then 'house'              -- 🏠
    when 'f09f8fa1' then 'house'              -- 🏡
    when 'f09f8d94' then 'utensils'           -- 🍔
    when 'f09f8dbd' then 'utensils'           -- 🍽
    when 'e29895'   then 'coffee'             -- ☕
    when 'f09f9195' then 'shirt'              -- 👕
    when 'f09f9b8d' then 'shopping-bag'       -- 🛍
    when 'f09f939a' then 'book-open'          -- 📚
    when 'f09f8e93' then 'graduation-cap'     -- 🎓
    when 'f09f90be' then 'paw-print'          -- 🐾
    when 'f09f8e81' then 'gift'               -- 🎁
    when 'e29c88'   then 'plane'              -- ✈
    when 'f09f8fa8' then 'hotel'              -- 🏨
    when 'f09f92a1' then 'zap'                -- 💡
    when 'f09f92b0' then 'piggy-bank'         -- 💰
    when 'f09f92b3' then 'credit-card'        -- 💳
    when 'f09f92b5' then 'banknote'           -- 💵
    when 'f09f8fa7' then 'banknote'           -- 🏧
    when 'e29ca8'   then 'sparkles'           -- ✨
    when 'f09f8eae' then 'gamepad-2'          -- 🎮
    when 'f09f8e9f' then 'ticket'             -- 🎟
    when 'f09f8db9' then 'wine'               -- 🍹
    when 'f09f8db7' then 'wine'               -- 🍷
    when 'f09f8dba' then 'beer'               -- 🍺
    when 'f09f8f96' then 'tree-palm'          -- 🏖
    when 'e29bb1'   then 'tree-palm'          -- ⛱
    when 'f09f93b7' then 'camera'             -- 📷
    when 'f09f8e92' then 'luggage'            -- 🎒
    when 'f09f8eb5' then 'music'              -- 🎵
    when 'f09f8ea7' then 'headphones'         -- 🎧
    when 'f09f8ea8' then 'palette'            -- 🎨
    when 'f09f92aa' then 'dumbbell'           -- 💪
    when 'f09f8f8b' then 'dumbbell'           -- 🏋
    when 'f09f9abf' then 'shower-head'        -- 🚿
    when 'f09f948c' then 'plug'               -- 🔌
    when 'f09f93b1' then 'phone'              -- 📱
    when 'f09f93b6' then 'wifi'               -- 📶
    when 'f09f9b8f' then 'bed'                -- 🛏
    when 'f09f9b8b' then 'sofa'               -- 🛋
    when 'f09f94a7' then 'wrench'             -- 🔧
    when 'f09f94a8' then 'hammer'             -- 🔨
    when 'f09f92bc' then 'briefcase'          -- 💼
    when 'f09f92bb' then 'laptop'             -- 💻
    when 'f09f8e82' then 'cake'               -- 🎂
    when 'f09f8d95' then 'pizza'              -- 🍕
    when 'f09f8d8e' then 'apple'              -- 🍎
    when 'f09f8d8f' then 'apple'              -- 🍏
    when 'f09f90b6' then 'dog'                -- 🐶
    when 'f09f90b1' then 'cat'                -- 🐱
    when 'e29da4'   then 'heart'              -- ❤
    when 'e2ad90'   then 'star'               -- ⭐
    when 'f09f8cb1' then 'sprout'             -- 🌱
    when 'f09f8c8d' then 'globe'              -- 🌍
    when 'e29bb0'   then 'mountain'           -- ⛰
    when 'f09f8f95' then 'tent'               -- 🏕
    when 'f09f97ba' then 'map'                -- 🗺
    when 'f09fa7ad' then 'compass'            -- 🧭
    when 'e29882'   then 'umbrella'           -- ☂
    when 'e29880'   then 'sun'                -- ☀
    when 'e29d84'   then 'snowflake'          -- ❄
    when 'f09f91a5' then 'users'              -- 👥
    when 'f09f91a4' then 'user'               -- 👤
    when 'f09f91b6' then 'baby'               -- 👶
    else 'tag'
  end as icono_destino
from public.categorias_viaje
where icono is null
group by emoji
order by categorias_viaje desc, emoji;


-- ============================================================================
-- BLOQUE 1: red de seguridad -- por si Fase B1 no corrio todavia
-- ============================================================================
-- Igual que sql/supabase_fix_trigger_categorias.sql re-declara "descripcion"/
-- "es_sistema" por si no llegaron a crearse: si sql/supabase_iconos_categorias.sql
-- (Fase B1) ya corrio, esto no hace nada. Si no corrio, lo crea aqui para que
-- los UPDATE de abajo no fallen. No toca "emoji" ni ninguna otra columna.
alter table public.categorias
  add column if not exists icono text;

alter table public.movimientos
  add column if not exists icono text;

alter table public.categorias_viaje
  add column if not exists icono text;


-- ============================================================================
-- BLOQUE 2: backfill categorias.icono
-- ============================================================================
-- Idempotente: "WHERE icono IS NULL" -> solo toca filas sin icono asignado
-- todavia. No pisa un icono elegido a mano en el selector (Fase B4). No toca
-- "emoji". Matching por HEX (no por el emoji literal) -- ver "HISTORIAL DE
-- ESTE BORRADOR" al principio del archivo. Mismo mapeo que el dry-run del
-- BLOQUE 0b.
update public.categorias
set icono = case regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '')
  when 'f09f9b92' then 'shopping-cart'      -- 🛒
  when 'f09f8eac' then 'clapperboard'       -- 🎬
  when 'f09f8ea5' then 'clapperboard'       -- 🎥
  when 'f09f909c' then 'coffee'             -- 🐜
  when 'f09f9a8c' then 'bus'                -- 🚌
  when 'f09f9a97' then 'car'                -- 🚗
  when 'f09f9a95' then 'car-taxi-front'     -- 🚕
  when 'e29bbd'   then 'fuel'               -- ⛽
  when 'f09f938c' then 'pin'                -- 📌
  when 'f09f928a' then 'pill'               -- 💊
  when 'f09f8fa5' then 'stethoscope'        -- 🏥
  when 'f09f8fa0' then 'house'              -- 🏠
  when 'f09f8fa1' then 'house'              -- 🏡
  when 'f09f8d94' then 'utensils'           -- 🍔
  when 'f09f8dbd' then 'utensils'           -- 🍽
  when 'e29895'   then 'coffee'             -- ☕
  when 'f09f9195' then 'shirt'              -- 👕
  when 'f09f9b8d' then 'shopping-bag'       -- 🛍
  when 'f09f939a' then 'book-open'          -- 📚
  when 'f09f8e93' then 'graduation-cap'     -- 🎓
  when 'f09f90be' then 'paw-print'          -- 🐾
  when 'f09f8e81' then 'gift'               -- 🎁
  when 'e29c88'   then 'plane'              -- ✈
  when 'f09f8fa8' then 'hotel'              -- 🏨
  when 'f09f92a1' then 'zap'                -- 💡
  when 'f09f92b0' then 'piggy-bank'         -- 💰
  when 'f09f92b3' then 'credit-card'        -- 💳
  when 'f09f92b5' then 'banknote'           -- 💵
  when 'f09f8fa7' then 'banknote'           -- 🏧
  when 'e29ca8'   then 'sparkles'           -- ✨
  when 'f09f8eae' then 'gamepad-2'          -- 🎮
  when 'f09f8e9f' then 'ticket'             -- 🎟
  when 'f09f8db9' then 'wine'               -- 🍹
  when 'f09f8db7' then 'wine'               -- 🍷
  when 'f09f8dba' then 'beer'               -- 🍺
  when 'f09f8f96' then 'tree-palm'          -- 🏖
  when 'e29bb1'   then 'tree-palm'          -- ⛱
  when 'f09f93b7' then 'camera'             -- 📷
  when 'f09f8e92' then 'luggage'            -- 🎒
  when 'f09f8eb5' then 'music'              -- 🎵
  when 'f09f8ea7' then 'headphones'         -- 🎧
  when 'f09f8ea8' then 'palette'            -- 🎨
  when 'f09f92aa' then 'dumbbell'           -- 💪
  when 'f09f8f8b' then 'dumbbell'           -- 🏋
  when 'f09f9abf' then 'shower-head'        -- 🚿
  when 'f09f948c' then 'plug'               -- 🔌
  when 'f09f93b1' then 'phone'              -- 📱
  when 'f09f93b6' then 'wifi'               -- 📶
  when 'f09f9b8f' then 'bed'                -- 🛏
  when 'f09f9b8b' then 'sofa'               -- 🛋
  when 'f09f94a7' then 'wrench'             -- 🔧
  when 'f09f94a8' then 'hammer'             -- 🔨
  when 'f09f92bc' then 'briefcase'          -- 💼
  when 'f09f92bb' then 'laptop'             -- 💻
  when 'f09f8e82' then 'cake'               -- 🎂
  when 'f09f8d95' then 'pizza'              -- 🍕
  when 'f09f8d8e' then 'apple'              -- 🍎
  when 'f09f8d8f' then 'apple'              -- 🍏
  when 'f09f90b6' then 'dog'                -- 🐶
  when 'f09f90b1' then 'cat'                -- 🐱
  when 'e29da4'   then 'heart'              -- ❤
  when 'e2ad90'   then 'star'               -- ⭐
  when 'f09f8cb1' then 'sprout'             -- 🌱
  when 'f09f8c8d' then 'globe'              -- 🌍
  when 'e29bb0'   then 'mountain'           -- ⛰
  when 'f09f8f95' then 'tent'               -- 🏕
  when 'f09f97ba' then 'map'                -- 🗺
  when 'f09fa7ad' then 'compass'            -- 🧭
  when 'e29882'   then 'umbrella'           -- ☂
  when 'e29880'   then 'sun'                -- ☀
  when 'e29d84'   then 'snowflake'          -- ❄
  when 'f09f91a5' then 'users'              -- 👥
  when 'f09f91a4' then 'user'               -- 👤
  when 'f09f91b6' then 'baby'               -- 👶
  else 'tag'
end
where icono is null;


-- ============================================================================
-- BLOQUE 3: backfill movimientos.icono
-- ============================================================================
-- Idempotente: "WHERE icono IS NULL AND emoji IS NOT NULL" -> las filas con
-- emoji NULL quedan igual (la app ya cae al fallback por tipo en ese caso).
-- Matching por HEX, mismo orden de prioridad que mapaEmojiIconoMovimiento()
-- en la app: emojis de TIPO primero ('💰'->'arrow-down-left',
-- '🔄'->'arrow-left-right'), despues el mismo CASE de categorias.
update public.movimientos
set icono = case regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '')
  when 'f09f92b0' then 'arrow-down-left'    -- 💰
  when 'f09f9484' then 'arrow-left-right'   -- 🔄
  when 'f09f9b92' then 'shopping-cart'      -- 🛒
  when 'f09f8eac' then 'clapperboard'       -- 🎬
  when 'f09f8ea5' then 'clapperboard'       -- 🎥
  when 'f09f909c' then 'coffee'             -- 🐜
  when 'f09f9a8c' then 'bus'                -- 🚌
  when 'f09f9a97' then 'car'                -- 🚗
  when 'f09f9a95' then 'car-taxi-front'     -- 🚕
  when 'e29bbd'   then 'fuel'               -- ⛽
  when 'f09f938c' then 'pin'                -- 📌
  when 'f09f928a' then 'pill'               -- 💊
  when 'f09f8fa5' then 'stethoscope'        -- 🏥
  when 'f09f8fa0' then 'house'              -- 🏠
  when 'f09f8fa1' then 'house'              -- 🏡
  when 'f09f8d94' then 'utensils'           -- 🍔
  when 'f09f8dbd' then 'utensils'           -- 🍽
  when 'e29895'   then 'coffee'             -- ☕
  when 'f09f9195' then 'shirt'              -- 👕
  when 'f09f9b8d' then 'shopping-bag'       -- 🛍
  when 'f09f939a' then 'book-open'          -- 📚
  when 'f09f8e93' then 'graduation-cap'     -- 🎓
  when 'f09f90be' then 'paw-print'          -- 🐾
  when 'f09f8e81' then 'gift'               -- 🎁
  when 'e29c88'   then 'plane'              -- ✈
  when 'f09f8fa8' then 'hotel'              -- 🏨
  when 'f09f92a1' then 'zap'                -- 💡
  when 'f09f92b3' then 'credit-card'        -- 💳
  when 'f09f92b5' then 'banknote'           -- 💵
  when 'f09f8fa7' then 'banknote'           -- 🏧
  when 'e29ca8'   then 'sparkles'           -- ✨
  when 'f09f8eae' then 'gamepad-2'          -- 🎮
  when 'f09f8e9f' then 'ticket'             -- 🎟
  when 'f09f8db9' then 'wine'               -- 🍹
  when 'f09f8db7' then 'wine'               -- 🍷
  when 'f09f8dba' then 'beer'               -- 🍺
  when 'f09f8f96' then 'tree-palm'          -- 🏖
  when 'e29bb1'   then 'tree-palm'          -- ⛱
  when 'f09f93b7' then 'camera'             -- 📷
  when 'f09f8e92' then 'luggage'            -- 🎒
  when 'f09f8eb5' then 'music'              -- 🎵
  when 'f09f8ea7' then 'headphones'         -- 🎧
  when 'f09f8ea8' then 'palette'            -- 🎨
  when 'f09f92aa' then 'dumbbell'           -- 💪
  when 'f09f8f8b' then 'dumbbell'           -- 🏋
  when 'f09f9abf' then 'shower-head'        -- 🚿
  when 'f09f948c' then 'plug'               -- 🔌
  when 'f09f93b1' then 'phone'              -- 📱
  when 'f09f93b6' then 'wifi'               -- 📶
  when 'f09f9b8f' then 'bed'                -- 🛏
  when 'f09f9b8b' then 'sofa'               -- 🛋
  when 'f09f94a7' then 'wrench'             -- 🔧
  when 'f09f94a8' then 'hammer'             -- 🔨
  when 'f09f92bc' then 'briefcase'          -- 💼
  when 'f09f92bb' then 'laptop'             -- 💻
  when 'f09f8e82' then 'cake'               -- 🎂
  when 'f09f8d95' then 'pizza'              -- 🍕
  when 'f09f8d8e' then 'apple'              -- 🍎
  when 'f09f8d8f' then 'apple'              -- 🍏
  when 'f09f90b6' then 'dog'                -- 🐶
  when 'f09f90b1' then 'cat'                -- 🐱
  when 'e29da4'   then 'heart'              -- ❤
  when 'e2ad90'   then 'star'               -- ⭐
  when 'f09f8cb1' then 'sprout'             -- 🌱
  when 'f09f8c8d' then 'globe'              -- 🌍
  when 'e29bb0'   then 'mountain'           -- ⛰
  when 'f09f8f95' then 'tent'               -- 🏕
  when 'f09f97ba' then 'map'                -- 🗺
  when 'f09fa7ad' then 'compass'            -- 🧭
  when 'e29882'   then 'umbrella'           -- ☂
  when 'e29880'   then 'sun'                -- ☀
  when 'e29d84'   then 'snowflake'          -- ❄
  when 'f09f91a5' then 'users'              -- 👥
  when 'f09f91a4' then 'user'               -- 👤
  when 'f09f91b6' then 'baby'               -- 👶
  else 'tag'
end
where icono is null and emoji is not null;


-- ============================================================================
-- BLOQUE 4: backfill categorias_viaje.icono
-- ============================================================================
-- Mismo CASE que categorias (BLOQUE 2) -- categorias_viaje es un sistema de
-- emojis paralelo pero con el mismo significado "tema de categoria", sin
-- emojis de tipo de movimiento. Idempotente: "WHERE icono IS NULL".
update public.categorias_viaje
set icono = case regexp_replace(encode(emoji::bytea, 'hex'), 'efb88f$', '')
  when 'f09f9b92' then 'shopping-cart'      -- 🛒
  when 'f09f8eac' then 'clapperboard'       -- 🎬
  when 'f09f8ea5' then 'clapperboard'       -- 🎥
  when 'f09f909c' then 'coffee'             -- 🐜
  when 'f09f9a8c' then 'bus'                -- 🚌
  when 'f09f9a97' then 'car'                -- 🚗
  when 'f09f9a95' then 'car-taxi-front'     -- 🚕
  when 'e29bbd'   then 'fuel'               -- ⛽
  when 'f09f938c' then 'pin'                -- 📌
  when 'f09f928a' then 'pill'               -- 💊
  when 'f09f8fa5' then 'stethoscope'        -- 🏥
  when 'f09f8fa0' then 'house'              -- 🏠
  when 'f09f8fa1' then 'house'              -- 🏡
  when 'f09f8d94' then 'utensils'           -- 🍔
  when 'f09f8dbd' then 'utensils'           -- 🍽
  when 'e29895'   then 'coffee'             -- ☕
  when 'f09f9195' then 'shirt'              -- 👕
  when 'f09f9b8d' then 'shopping-bag'       -- 🛍
  when 'f09f939a' then 'book-open'          -- 📚
  when 'f09f8e93' then 'graduation-cap'     -- 🎓
  when 'f09f90be' then 'paw-print'          -- 🐾
  when 'f09f8e81' then 'gift'               -- 🎁
  when 'e29c88'   then 'plane'              -- ✈
  when 'f09f8fa8' then 'hotel'              -- 🏨
  when 'f09f92a1' then 'zap'                -- 💡
  when 'f09f92b0' then 'piggy-bank'         -- 💰
  when 'f09f92b3' then 'credit-card'        -- 💳
  when 'f09f92b5' then 'banknote'           -- 💵
  when 'f09f8fa7' then 'banknote'           -- 🏧
  when 'e29ca8'   then 'sparkles'           -- ✨
  when 'f09f8eae' then 'gamepad-2'          -- 🎮
  when 'f09f8e9f' then 'ticket'             -- 🎟
  when 'f09f8db9' then 'wine'               -- 🍹
  when 'f09f8db7' then 'wine'               -- 🍷
  when 'f09f8dba' then 'beer'               -- 🍺
  when 'f09f8f96' then 'tree-palm'          -- 🏖
  when 'e29bb1'   then 'tree-palm'          -- ⛱
  when 'f09f93b7' then 'camera'             -- 📷
  when 'f09f8e92' then 'luggage'            -- 🎒
  when 'f09f8eb5' then 'music'              -- 🎵
  when 'f09f8ea7' then 'headphones'         -- 🎧
  when 'f09f8ea8' then 'palette'            -- 🎨
  when 'f09f92aa' then 'dumbbell'           -- 💪
  when 'f09f8f8b' then 'dumbbell'           -- 🏋
  when 'f09f9abf' then 'shower-head'        -- 🚿
  when 'f09f948c' then 'plug'               -- 🔌
  when 'f09f93b1' then 'phone'              -- 📱
  when 'f09f93b6' then 'wifi'               -- 📶
  when 'f09f9b8f' then 'bed'                -- 🛏
  when 'f09f9b8b' then 'sofa'               -- 🛋
  when 'f09f94a7' then 'wrench'             -- 🔧
  when 'f09f94a8' then 'hammer'             -- 🔨
  when 'f09f92bc' then 'briefcase'          -- 💼
  when 'f09f92bb' then 'laptop'             -- 💻
  when 'f09f8e82' then 'cake'               -- 🎂
  when 'f09f8d95' then 'pizza'              -- 🍕
  when 'f09f8d8e' then 'apple'              -- 🍎
  when 'f09f8d8f' then 'apple'              -- 🍏
  when 'f09f90b6' then 'dog'                -- 🐶
  when 'f09f90b1' then 'cat'                -- 🐱
  when 'e29da4'   then 'heart'              -- ❤
  when 'e2ad90'   then 'star'               -- ⭐
  when 'f09f8cb1' then 'sprout'             -- 🌱
  when 'f09f8c8d' then 'globe'              -- 🌍
  when 'e29bb0'   then 'mountain'           -- ⛰
  when 'f09f8f95' then 'tent'               -- 🏕
  when 'f09f97ba' then 'map'                -- 🗺
  when 'f09fa7ad' then 'compass'            -- 🧭
  when 'e29882'   then 'umbrella'           -- ☂
  when 'e29880'   then 'sun'                -- ☀
  when 'e29d84'   then 'snowflake'          -- ❄
  when 'f09f91a5' then 'users'              -- 👥
  when 'f09f91a4' then 'user'               -- 👤
  when 'f09f91b6' then 'baby'               -- 👶
  else 'tag'
end
where icono is null;


-- ============================================================================
-- BLOQUE 5: trigger handle_new_user() -- agrega "icono" al INSERT de categorias
-- ============================================================================
-- ⚠️ Esto reemplaza la funcion completa (no hay forma de "agregar una
-- columna al INSERT" sin re-declarar el cuerpo entero: asi es como funciona
-- "create or replace function" en Postgres). Por eso el BLOQUE 0a de arriba
-- es obligatorio: hay que confirmar que este cuerpo, MENOS el cambio de
-- "icono", es identico a lo que hay hoy en produccion.
--
-- Origen: copiado literal de sql/supabase_fix_trigger_categorias.sql (PARTE
-- 1), la version CONFIRMADA vigente desde 2026-08-27 (sql/README.md paso
-- 21). UNICO cambio: la columna "icono" se agrega a las 2 listas de INSERT
-- de categorias (es/en), con el valor fijo que le corresponde a cada una.
-- "emoji" se deja tal cual, en la misma posicion -- se sigue sembrando
-- durante la transicion (Fase B5 es la que, mas adelante, decide si se deja
-- de escribir). Los 6 literales de emoji de este bloque (🛒🎬🐜🚌⛽📌) se
-- verificaron por hex (extrayendo este bloque del archivo con Node y
-- comparando contra el hex canonico): coinciden exactos, no tienen el bug
-- descrito en "HISTORIAL DE ESTE BORRADOR" (ahi cada emoji aparece una sola
-- vez, no en un CASE repetido muchas veces).
-- Nada mas cambia: ni el orden de las columnas de fondo_emergencia/perfiles,
-- ni una sola linea del bloque de consentimientos (Ley 1581), ni la logica
-- de moneda_elegida/idioma_elegido.
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

  -- Categorias por defecto: lista nueva, 7 columnas (se agrega "icono"),
  -- es_sistema = true SOLO en "Gastos fijos" / "Fixed expenses". "emoji" se
  -- conserva igual que antes (transicion Fase B).
  if idioma_elegido = 'en' then
    insert into public.categorias (user_id, nombre, emoji, icono, color, descripcion, es_sistema) values
      (new.id, 'Groceries',            '🛒', 'shopping-cart', '#4fd1a5', null, false),
      (new.id, 'Leisure',              '🎬', 'clapperboard',  '#e9b949', null, false),
      (new.id, 'Small daily expenses', '🐜', 'coffee',        '#e07ba0',
        'Small daily expenses that add up without noticing (coffee, snacks, tips...)', false),
      (new.id, 'Transport',            '🚌', 'bus',           '#9b8cf0', null, false),
      (new.id, 'Fuel',                 '⛽', 'fuel',          '#f2795b', null, false),
      (new.id, 'Fixed expenses',       '📌', 'pin',           '#9db0a6', null, true);
  else
    insert into public.categorias (user_id, nombre, emoji, icono, color, descripcion, es_sistema) values
      (new.id, 'Mercado',         '🛒', 'shopping-cart', '#4fd1a5', null, false),
      (new.id, 'Ocio',            '🎬', 'clapperboard',  '#e9b949', null, false),
      (new.id, 'Gastos hormiga',  '🐜', 'coffee',        '#e07ba0',
        'Pequeños gastos diarios que suman sin darte cuenta (café, snacks, propinas...)', false),
      (new.id, 'Transporte',      '🚌', 'bus',           '#9b8cf0', null, false),
      (new.id, 'Gasolina',        '⛽', 'fuel',          '#f2795b', null, false),
      (new.id, 'Gastos fijos',    '📌', 'pin',           '#9db0a6', null, true);
  end if;

  insert into public.fondo_emergencia (user_id, monto_actual, meses_meta)
  values (new.id, 0, 6);

  insert into public.perfiles (user_id, moneda, idioma)
  values (new.id, moneda_elegida, idioma_elegido);

  -- Constancia de consentimiento (Ley 1581) -- INTACTO, sin tocar ni una
  -- linea (copiado literal de supabase_fix_trigger_categorias.sql).
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
-- VERIFICACION (correr despues de los BLOQUES 1-5)
-- ============================================================================

-- 1) No debe quedar ninguna categoria/movimiento/categoria_viaje con icono
--    NULL donde habia emoji (los movimientos con emoji NULL quedan en NULL a
--    proposito -- caen al fallback por tipo en la app).
-- select
--   (select count(*) from public.categorias
--     where icono is null) as categorias_icono_null,
--   (select count(*) from public.movimientos
--     where icono is null and emoji is not null) as movimientos_icono_null,
--   (select count(*) from public.categorias_viaje
--     where icono is null) as categorias_viaje_icono_null;
-- esperado: 0, 0, 0.

-- 2) Ningun icono cayo en el fallback 'tag' por sorpresa (revisar a mano si
--    aparece algo aca -- puede ser legitimo, o un emoji nuevo que falta en el
--    mapa de src/utils/mapaEmojiIcono.js -- si aparece, agregar su hex ahi Y
--    en este script, regenerando ambos desde el mismo Buffer.from(...)).
-- select 'categorias' as tabla, emoji, encode(emoji::bytea,'hex') as hex, count(*)
--   from public.categorias where icono = 'tag' group by emoji
-- union all
-- select 'movimientos', emoji, encode(emoji::bytea,'hex'), count(*)
--   from public.movimientos where icono = 'tag' group by emoji
-- union all
-- select 'categorias_viaje', emoji, encode(emoji::bytea,'hex'), count(*)
--   from public.categorias_viaje where icono = 'tag' group by emoji
-- order by 1, 4 desc;

-- 3) "emoji" sigue intacto en las 3 tablas (mismos conteos que antes de
--    correr este script -- comparar contra el BLOQUE 0).
-- select
--   (select count(*) from public.categorias      where emoji is not null) as categorias_con_emoji,
--   (select count(*) from public.movimientos      where emoji is not null) as movimientos_con_emoji,
--   (select count(*) from public.categorias_viaje where emoji is not null) as categorias_viaje_con_emoji;

-- 4) El trigger nuevo trae "icono" en el INSERT de categorias (busca la
--    palabra "icono" en la definicion -- deberia aparecer 3 veces: en la
--    lista de columnas del INSERT de cada idioma, mas los 6 valores).
-- select pg_get_functiondef(oid) as definicion_actual
-- from pg_proc
-- where proname = 'handle_new_user';

-- 5) Prueba funcional del trigger (opcional, en un entorno de prueba, NO en
--    produccion con un usuario real): registrar una cuenta nueva y confirmar
--    que sus 6 categorias por defecto nacen con "icono" poblado:
-- select nombre, emoji, icono, es_sistema
-- from public.categorias
-- where user_id = '<uuid de la cuenta de prueba>'
-- order by es_sistema, nombre;


-- ============================================================================
-- Fin del script.
--
-- Que NO hace (a proposito):
--   - NO toca "emoji" en ninguna tabla, en ningun punto.
--   - NO borra ni renombra columnas.
--   - NO cambia el bloque de consentimientos, fondo_emergencia ni perfiles
--     del trigger.
--   - NO pisa un "icono" ya asignado a mano por el selector (Fase B4 -- que
--     todavia no existe en la app, asi que hoy es imposible que haya icono
--     asignado por el usuario, pero el WHERE icono IS NULL deja el script
--     seguro igual para cuando exista).
--
-- Rollback:
--   - Backfill: "update public.categorias set icono = null;" (idem
--     movimientos / categorias_viaje) deja las columnas como antes de este
--     script. "emoji" nunca se toco, asi que no hay perdida de datos.
--   - Trigger: re-aplicar sql/supabase_fix_trigger_categorias.sql (PARTE 1)
--     tal cual esta en el repo restaura la version sin "icono".
--
-- Siguiente paso: Fase B4 (SelectorIcono.jsx + HojaCategoria.jsx +
-- services/categorias.js escriben "icono" al crear/editar).
-- ============================================================================
