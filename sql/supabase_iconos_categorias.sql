-- ============================================================================
-- supabase_iconos_categorias.sql
--
-- [BORRADOR] -- NO EJECUTADO TODAVIA. Revisar y aplicar en Supabase -> SQL
-- Editor. Cuando se confirme que corrio, marcar como aplicado aca y en
-- sql/README.md anotando con que consultas se verifico.
--
-- ============================================================================
-- QUE RESUELVE
-- ============================================================================
-- Fase B1 del PLAN-iconos.md (raiz del repo): unificacion visual de iconos.
-- La app pasa de emojis a iconos de linea de lucide-react. Para las CATEGORIAS
-- (y para el snapshot de icono que cada MOVIMIENTO guarda al crearse) hace
-- falta una columna nueva donde persistir el nombre del icono elegido
-- (ej. 'shopping-cart', 'coffee', 'car-taxi-front') -- el mismo nombre kebab
-- que ya cataloga src/utils/catalogoIconos.js (Fase 0, ya en el repo).
--
-- Este script SOLO agrega columnas. Es ADITIVO PURO:
--   - Nada las lee todavia (el codigo que las consume llega en la Fase B2).
--   - Toda fila existente queda con icono = NULL.
--   - La columna "emoji" NO se toca: se conserva intacta como (a) fuente del
--     mapeo automatico del backfill (Fase B3) y (b) red de rollback -- si el
--     mapeo se equivoca o hay que revertir, el emoji original sigue ahi.
--   - Durante la ventana entre desplegar el codigo B2 y correr el backfill B3,
--     la app deriva el icono en vivo desde el emoji con
--     src/utils/mapaEmojiIcono.js (misma logica que tendra el CASE del SQL de
--     B3). Por eso el orden seguro es: B1 (este) -> B2 (codigo con fallback)
--     -> B3 (backfill + trigger).
--
-- ============================================================================
-- QUE HACE ESTE SCRIPT, EN ESTE ORDEN
-- ============================================================================
--   PASO 0. (SOLO LECTURA) Dry-run: que emojis hay hoy y cuantas filas por
--           emoji, en categorias / movimientos / categorias_viaje. Correr esto
--           PRIMERO, solo, y guardar el resultado: es el insumo para armar y
--           revisar el CASE del backfill (Fase B3) sin sorpresas.
--   PASO 1. categorias.icono   text, nullable, SIN default.
--   PASO 2. movimientos.icono  text, nullable, SIN default.
--   PASO 3. categorias_viaje.icono text, nullable, SIN default.
--           (Adelanto de la Fase VIAJE -- ver nota en el paso.)
--
-- Seguro de ejecutar mas de una vez: las tres son "add column if not exists".
-- SIN DROP, SIN DELETE, SIN UPDATE de datos en ningun punto. No toca el
-- trigger handle_new_user() (eso es Fase B3). No toca RLS ni grants: una
-- columna nueva hereda los privilegios de tabla existentes (los GRANT
-- select/insert/update sobre categorias / movimientos / categorias_viaje ya
-- cubren la columna icono; las politicas RLS son a nivel de fila, no de
-- columna, asi que no cambian).
-- ============================================================================


-- ============================================================================
-- PASO 0: (SOLO LECTURA) dry-run del estado actual de los emojis
-- ============================================================================
-- No cambia nada. Correr este bloque SOLO, antes de los PASOS 1-3, y conservar
-- la salida. Sirve para:
--   - Ver el universo real de emojis a mapear (puede haber emojis escritos a
--     mano en el input libre de HojaCategoria.jsx que no esten en la lista de
--     sugeridos).
--   - Dimensionar el backfill (cuantas filas toca cada rama del CASE).
--   - Detectar emojis raros / vacios / con selector de variacion (U+FE0F).

-- 0a) Categorias por emoji (de mas comun a menos).
select
  emoji,
  count(*) as categorias
from public.categorias
group by emoji
order by categorias desc, emoji;

-- 0b) Movimientos por emoji (solo los que tienen emoji; hay filas con NULL).
select
  emoji,
  count(*) as movimientos
from public.movimientos
where emoji is not null
group by emoji
order by movimientos desc, emoji;

-- 0c) Categorias de viaje por emoji.
select
  emoji,
  count(*) as categorias_viaje
from public.categorias_viaje
group by emoji
order by categorias_viaje desc, emoji;

-- 0d) (opcional) Cuantos movimientos NO tienen emoji -> caeran al fallback por
--     tipo en la app, no hay nada que mapear para ellos.
select
  count(*) filter (where emoji is null) as movimientos_sin_emoji,
  count(*)                              as movimientos_total
from public.movimientos;


-- ============================================================================
-- PASO 1: categorias.icono
-- ============================================================================
-- text, nullable, SIN default. NULL = "esta categoria todavia no tiene icono
-- propio; derivalo del emoji" (lo hace la app en B2 y el backfill en B3).
-- No se pone un default ('tag') a proposito: queremos poder distinguir
-- "sin asignar" (NULL) de "asignado explicitamente a tag".
alter table public.categorias
  add column if not exists icono text;

comment on column public.categorias.icono is
  'Nombre del icono de linea (lucide, kebab-case: shopping-cart, coffee, ...) del catalogo src/utils/catalogoIconos.js. NULL = sin asignar -> la app lo deriva de "emoji" con mapaEmojiIcono() hasta el backfill. "emoji" se conserva como fuente del mapeo y red de rollback. Ver PLAN-iconos.md (Parte B) y sql/supabase_iconos_categorias.sql.';


-- ============================================================================
-- PASO 2: movimientos.icono
-- ============================================================================
-- Mismo tipo y semantica. Modelo "snapshot" (igual que movimientos.emoji hoy):
-- cada movimiento guarda SU icono al crearse -- copia del de la categoria, o
-- el icono fijo del tipo (ingreso/traslado/retiro/pago_tarjeta). No se
-- re-deriva de la categoria en vivo (eso seria la Fase B-EXTRA, opcional).
alter table public.movimientos
  add column if not exists icono text;

comment on column public.movimientos.icono is
  'Snapshot del icono de linea del movimiento al momento de crearse (copia del icono de su categoria, o el icono fijo de su tipo). NULL en filas historicas -> la app cae al fallback por tipo / al mapeo de "emoji". Se rellena en el backfill B3. Ver PLAN-iconos.md (Parte B).';


-- ============================================================================
-- PASO 3: categorias_viaje.icono  (adelanto de la Fase VIAJE)
-- ============================================================================
-- El PLAN-iconos.md deja los iconos de "categorias_viaje" para una fase
-- paralela opcional al final (Fase VIAJE, paso 11). Se agrega la columna AQUI,
-- junto con las otras dos, porque:
--   - Es la MISMA operacion aditiva y sin riesgo (text, nullable, sin default;
--     nada la lee).
--   - Deja el esquema uniforme y listo: cuando se haga la Fase VIAJE sera
--     100% codigo, sin una segunda visita al editor SQL ni el riesgo de
--     olvidar esta migracion.
--   - No compromete a nada: si la Fase VIAJE no se hace nunca, la columna
--     queda inerte en NULL, igual que "emoji" seguiria siendo la fuente.
-- Si preferis mantener el alcance de B1 estrictamente a "categorias +
-- movimientos" (como lo lista el plan), comenta este PASO 3 y muevelo a un
-- script propio de la Fase VIAJE -- el resto del script no depende de el.
alter table public.categorias_viaje
  add column if not exists icono text;

comment on column public.categorias_viaje.icono is
  'Nombre del icono de linea (lucide, kebab-case) del catalogo src/utils/catalogoIconos.js. NULL = sin asignar -> derivar de "emoji". Adelanto de la Fase VIAJE del PLAN-iconos.md; hoy nada lo lee. "emoji" se conserva.';


-- ============================================================================
-- VERIFICACION (correr despues de los PASOS 1-3)
-- ============================================================================

-- 1) Las tres columnas "icono" existen, son text, nullable y sin default.
-- select table_name, column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and column_name = 'icono'
--   and table_name in ('categorias', 'movimientos', 'categorias_viaje')
-- order by table_name;
-- esperado: 3 filas, data_type = 'text', is_nullable = 'YES',
--           column_default = NULL en las tres.

-- 2) Ninguna fila quedo con icono asignado (este script NO hace backfill).
-- select
--   (select count(*) from public.categorias        where icono is not null) as categorias_con_icono,
--   (select count(*) from public.movimientos        where icono is not null) as movimientos_con_icono,
--   (select count(*) from public.categorias_viaje   where icono is not null) as categorias_viaje_con_icono;
-- esperado: 0, 0, 0.

-- 3) "emoji" sigue intacto (mismos conteos que en el PASO 0, nada cambio).
-- select
--   (select count(*) from public.categorias      where emoji is not null) as categorias_con_emoji,
--   (select count(*) from public.movimientos      where emoji is not null) as movimientos_con_emoji,
--   (select count(*) from public.categorias_viaje where emoji is not null) as categorias_viaje_con_emoji;

-- 4) El comentario de columna quedo puesto (documentacion viva en la BD).
-- select
--   (c.relname)::text                     as tabla,
--   a.attname                             as columna,
--   col_description(c.oid, a.attnum)      as comentario
-- from pg_attribute a
-- join pg_class c on c.oid = a.attrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and a.attname = 'icono'
--   and c.relname in ('categorias', 'movimientos', 'categorias_viaje')
-- order by tabla;


-- ============================================================================
-- Fin del script.
--
-- Que NO hace (a proposito -- viene en fases siguientes):
--   - NO rellena "icono" (backfill emoji -> icono): Fase B3, script propio
--     sql/... con el CASE de mapeo + dry-run + verificacion.
--   - NO toca el trigger handle_new_user(): Fase B3. Toda cuenta nueva que se
--     cree entre este script y B3 nace con sus categorias por defecto en
--     icono = NULL, y la app las pinta via el fallback de "emoji" -- correcto.
--   - NO modifica codigo de la app.
--   - NO borra la columna "emoji" (eso seria la Fase LIMPIEZA FINAL, semanas
--     despues, con respaldo -- punto de no retorno).
--
-- Rollback: como no se toco ningun dato, revertir es "no usar la columna".
-- Si se quiere dejar la tabla exactamente como estaba:
--   alter table public.categorias      drop column if exists icono;
--   alter table public.movimientos     drop column if exists icono;
--   alter table public.categorias_viaje drop column if exists icono;
-- (No hace falta para el rollback del codigo -- revertir el/los PR alcanza;
--  las columnas quedan inertes.)
--
-- Siguiente paso: Fase B2 (codigo que lee icono || mapaEmojiIcono(emoji) ||
-- 'tag'), y despues Fase B3 (backfill + trigger).
-- ============================================================================
