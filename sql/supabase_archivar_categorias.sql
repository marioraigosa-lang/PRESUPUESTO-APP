-- ============================================================================
-- supabase_archivar_categorias.sql
--
-- ✅ APLICADO (2026-09-16) -- PASOS 1 y 2 ejecutados en Supabase -> SQL
-- Editor: columna "categorias.archivada_en" e índice parcial
-- "categorias_activas_idx" creados. PASO 3 es solo informativo (no ejecuta
-- nada, documenta por qué la FK de categoria_id se deja sin tocar).
--
-- ============================================================================
-- QUE RESUELVE Y POR QUE
-- ============================================================================
-- Hoy borrar una categoria variable con gastos exige "reasignar y eliminar"
-- (ver services/categorias.js -> reasignarYEliminarCategoria y
-- HojaReasignarCategoria.jsx): antes de dejar borrar la categoria, obliga a
-- mover TODOS sus movimientos (incluidos los historicos de meses pasados) a
-- otra categoria existente. Eso reescribe el pasado -- un gasto de agosto en
-- "Ocio" deja de verse como "Ocio" para siempre, aunque el movimiento en si
-- nunca se borro.
--
-- Mismo diagnostico que ya paso con tarjetas (ver supabase_archivar_
-- tarjetas.sql): una categoria con historial NUNCA deberia borrarse ni
-- reescribirse. Se ARCHIVA. Plan completo (aprobado, no construido todavia
-- salvo este script): una categoria archivada
--   - sigue apareciendo en los meses donde SI tiene gastos (con su nombre,
--     su icono, su total -- el historial de ese mes queda intacto),
--   - deja de aparecer en los meses donde NO tiene gastos (ej. el mes
--     actual, si ya no se usa),
--   - deja de aparecer como opcion al registrar un gasto NUEVO.
--
-- A diferencia de tarjetas, ese filtro de "visible segun el periodo" NO es
-- una condicion fija (no existe un "where archivada_en is null" que sirva
-- para todos los casos): depende de que mes esta mirando la app en cada
-- momento. Por eso este script NO toca ninguna vista ni agrega logica de
-- visibilidad en la base -- el filtro por periodo se calcula en la app
-- (GastosVariables.jsx cruza categorias x gastos del mes ya en JS). Este
-- script solo agrega la columna y el indice que esa logica va a necesitar.
--
-- Este script es ADITIVO PURO: no toca datos existentes, no toca la FK
-- movimientos.categoria_id (se queda en ON DELETE SET NULL, igual que hoy --
-- sin uso practico, porque el flujo de la app nunca borra una categoria con
-- movimientos; ver mas abajo por que se deja asi) y no hace backfill alguno.
--
-- ============================================================================
-- QUE HACE ESTE SCRIPT, EN ESTE ORDEN
-- ============================================================================
--   PASO 0. (solo lectura) Confirmar el estado real antes de tocar nada: la
--           FK de categoria_id y su modo actual, y un vistazo a las
--           categorias existentes.
--   PASO 1. Agregar la columna "categorias.archivada_en" (timestamptz,
--           nullable, SIN default -> toda categoria existente queda activa
--           / NULL).
--   PASO 2. Indice parcial "categorias_activas_idx" para la consulta mas
--           frecuente ("mis categorias activas").
--   PASO 3. FK "movimientos.categoria_id": NO se toca. Comentario explicando
--           por que se deja en ON DELETE SET NULL.
--
-- Seguro de ejecutar mas de una vez: "add column if not exists", "create
-- index if not exists". SIN DROP TABLE, DELETE, UPDATE ni alteracion de
-- ninguna fila existente en ningun punto -- lo unico que se agrega a
-- "categorias" es la columna nueva, en NULL para todas las filas.
-- ============================================================================


-- ============================================================================
-- PASO 0: (SOLO LECTURA) confirmar el estado real antes de tocar nada
-- ============================================================================
-- Correr esto primero, solo, y comparar contra lo que este script asume.

-- 0a) FK de categoria_id: nombre y modo (se espera SET NULL, sin cambios
--     desde sql/supabase_setup.sql).
select
  conname as nombre_constraint,
  pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.movimientos'::regclass
  and contype = 'f'
  and conname = 'movimientos_categoria_id_fkey';
-- esperado: FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL

-- 0b) Columnas actuales de "categorias" (se espera que "archivada_en" NO
--     exista todavia -- este script la agrega en el PASO 1).
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'categorias'
order by ordinal_position;

-- 0c) Dry-run: categorias actuales del usuario logueado con su estado hoy
--     (todas activas, porque "archivada_en" todavia no existe) y cuantos
--     movimientos tiene cada una -- para tener un antes/despues a mano al
--     revisar el script. Sin filtro de "es_sistema": conviene ver tambien la
--     categoria de sistema en este vistazo (no se va a poder archivar --
--     esa regla queda del lado de la app, en services/categorias.js, igual
--     que ya bloquea editarla/eliminarla).
select
  c.id,
  c.nombre,
  c.es_sistema,
  c.presupuesto,
  count(m.id) as cantidad_movimientos
from public.categorias c
left join public.movimientos m on m.categoria_id = c.id
where c.user_id = auth.uid()
group by c.id, c.nombre, c.es_sistema, c.presupuesto
order by c.es_sistema, c.nombre;
-- esperado: todas las filas sin ninguna nocion de "archivada" (la columna
-- todavia no existe) -- este SELECT sirve de referencia para repetirlo
-- despues del PASO 1 y confirmar que nada cambio salvo la columna nueva.


-- ============================================================================
-- PASO 1: columna "categorias.archivada_en"
-- ============================================================================
-- timestamptz nullable, SIN default. Misma semantica que "tarjetas.
-- archivada_en" (ver supabase_archivar_tarjetas.sql PASO 1):
--   archivada_en IS NULL      -> categoria ACTIVA (aparece siempre: en el
--                                mes actual, en el grid de "gasto nuevo",
--                                en Gestion de categorias).
--   archivada_en IS NOT NULL  -> categoria ARCHIVADA (oculta EN LOS MESES
--                                SIN gastos suyos y en el grid de "gasto
--                                nuevo"; pero SIGUE apareciendo en cualquier
--                                mes donde si tenga gastos, con su nombre e
--                                icono intactos -- ese filtro por periodo lo
--                                calcula la app, no esta columna).
--
-- Se elige timestamptz (no un boolean "archivada default false") por el
-- mismo motivo que en tarjetas: es un superconjunto -- "archivada_en is not
-- null" ya responde el si/no, y ademas queda registrado el CUANDO gratis
-- (util para la seccion "Archivadas" de Gestion de categorias y para poder
-- desarchivar con contexto de cuando se archivo).
--
-- Sin default -> no hay backfill: toda fila existente queda en NULL =
-- activa, que es lo correcto (nadie queda archivado por accidente).
alter table public.categorias
  add column if not exists archivada_en timestamptz;

comment on column public.categorias.archivada_en is 'Fecha en que la categoria se archivo (deja de mostrarse como opcion para gastos nuevos, y desaparece de los meses donde no tiene gastos). NULL = categoria activa. Una categoria con historial nunca se borra: se archiva. Sus gastos pasados conservan categoria_id intacto y se siguen viendo, con nombre e icono originales, en cualquier mes donde tengan movimientos. Ver sql/supabase_archivar_categorias.sql.';


-- ============================================================================
-- PASO 2: indice parcial "categorias_activas_idx"
-- ============================================================================
-- La consulta mas frecuente es "mis categorias ACTIVAS" (grid de "gasto
-- nuevo", Gestion de categorias antes de separar la seccion "Archivadas").
-- Un indice parcial sobre (user_id) WHERE archivada_en is null es mas chico
-- que uno total y sirve exactamente a esa consulta. Mismo criterio que
-- "categorias_user_id_idx" (supabase_etapa2_usuarios.sql) y que
-- "tarjetas_activas_idx" (supabase_archivar_tarjetas.sql PASO 2), acotado a
-- las activas.
create index if not exists categorias_activas_idx
  on public.categorias (user_id)
  where archivada_en is null;


-- ============================================================================
-- PASO 3: FK "movimientos.categoria_id" -- NO SE TOCA (queda en ON DELETE SET NULL)
-- ============================================================================
-- La FK movimientos_categoria_id_fkey esta en ON DELETE SET NULL desde
-- sql/supabase_setup.sql. Este script la DEJA ASI. Por que sigue siendo
-- correcto (aunque, a diferencia de tarjetas, nunca llego a causar un bug
-- por su modo actual):
--
--   - En el flujo normal ya NUNCA se hace "delete from categorias" cuando
--     hay movimientos de por medio: el plan aprobado reemplaza "reasignar y
--     eliminar" por archivar (un UPDATE de archivada_en). El borrado real
--     (services/categorias.js -> eliminarCategoria) solo se deja disponible
--     cuando la categoria tiene CERO movimientos historicos -- ahi no hay
--     ninguna fila de "movimientos" que dependa de esa categoria, asi que el
--     modo de la FK ni se ejerce.
--   - A diferencia de tarjeta_id (donde SET NULL rompia
--     movimientos_traslado_forma_check -- ver supabase_archivar_
--     tarjetas.sql PASO 5, modelo 1), un movimiento tipo 'gasto' SI admite
--     categoria_id NULL sin violar ningun constraint (ver
--     sql/supabase_tarjetas_movimientos.sql: la forma de un 'gasto' no
--     exige categoria). Por eso SET NULL nunca fue un bug aca.
--   - Si de todos modos se borrara una categoria con movimientos por fuera
--     de la app (SQL manual, otro cliente), SET NULL es un resultado
--     razonable: el gasto sobrevive sin categoria, en vez de fallar el
--     DELETE (RESTRICT) o arrastrar movimientos reales con el (CASCADE).
--
-- (Bloque informativo, no ejecuta nada -- solo documenta la decision.)


-- ============================================================================
-- VERIFICACION (correr despues de los PASOS 1-2)
-- ============================================================================

-- 1) La columna "archivada_en" existe, es timestamptz y es nullable.
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'categorias'
--   and column_name = 'archivada_en';
-- esperado: 1 fila, data_type = 'timestamp with time zone',
--           is_nullable = 'YES', column_default = NULL

-- 2) Ninguna categoria quedo archivada por accidente -- toda fila existente
--    debe seguir NULL (activa) justo despues del ALTER.
-- select count(*) as categorias_archivadas
-- from public.categorias
-- where archivada_en is not null;
-- esperado: 0

-- 3) El indice parcial existe.
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public' and tablename = 'categorias'
--   and indexname = 'categorias_activas_idx';
-- esperado: 1 fila, indexdef con "WHERE (archivada_en IS NULL)"

-- 4) La FK movimientos_categoria_id_fkey sigue en ON DELETE SET NULL (no se
--    toco).
-- select conname, pg_get_constraintdef(oid) as definicion
-- from pg_constraint
-- where conrelid = 'public.movimientos'::regclass
--   and conname = 'movimientos_categoria_id_fkey';
-- esperado: FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL

-- 5) Repetir el dry-run del PASO 0c: mismas filas, mismo conteo de
--    movimientos por categoria, ahora con "archivada_en" disponible (en
--    NULL en todas).
-- select
--   c.id, c.nombre, c.es_sistema, c.archivada_en, count(m.id) as cantidad_movimientos
-- from public.categorias c
-- left join public.movimientos m on m.categoria_id = c.id
-- where c.user_id = auth.uid()
-- group by c.id, c.nombre, c.es_sistema, c.archivada_en
-- order by c.es_sistema, c.nombre;
-- esperado: mismas filas y mismos conteos que el PASO 0c, "archivada_en"
-- NULL en todas.


-- ============================================================================
-- Fin del script.
--
-- Que NO toca (a proposito):
--   - Datos de "movimientos" ni de "categorias": lo unico que se agrega a
--     "categorias" es la columna archivada_en, en NULL para todas las filas.
--   - La FK movimientos_categoria_id_fkey: se deja en ON DELETE SET NULL
--     (PASO 3).
--   - Ninguna vista ni funcion: a diferencia de tarjetas_con_deuda, la
--     visibilidad "archivada pero con gastos este mes" depende del periodo
--     que este mirando la app, no es un filtro fijo -- se resuelve en JS
--     (GastosVariables.jsx), no en SQL. Este script no crea ninguna vista
--     nueva de categorias.
--   - RLS de "categorias": las politicas existentes (supabase_etapa3_rls.sql
--     + el refuerzo de es_sistema en supabase_reforzar_integridad.sql) ya
--     cubren cualquier columna de la fila, incluida la nueva -- no hace
--     falta tocarlas para que un UPDATE de archivada_en quede sujeto a RLS
--     igual que cualquier otro UPDATE de categorias.
--
-- Lo que este script dejo preparado (fases siguientes del plan aprobado,
-- fuera de este script SQL) YA SE CONSTRUYO tambien:
--   - services/categorias.js: archivarCategoria / desarchivarCategoria (UPDATE
--     simple de archivada_en, sin la validacion de "deuda 0" que si tiene
--     archivarTarjeta -- una categoria no tiene ningun invariante acumulativo
--     que archivar pueda romper).
--   - Se quito reasignarYEliminarCategoria y HojaReasignarCategoria.jsx.
--   - GastosVariables.jsx: filtro "archivada_en is null OR gastado_en_el_mes > 0".
--   - GestionCategorias.jsx: seccion "Archivadas" con boton "Desarchivar".
--   - AsistenteMovimiento.jsx / HojaEditarMovimiento.jsx: el grid de un gasto
--     nuevo solo ofrece categorias activas; el de editar pinnea la categoria
--     archivada del movimiento que se esta editando.
-- ============================================================================
