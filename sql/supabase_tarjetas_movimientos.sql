-- ============================================================================
-- supabase_tarjetas_movimientos.sql
--
-- FASE 2 del plan "Tarjetas de crédito" (Fase 1: supabase_tarjetas.sql, ya
-- ejecutada y verificada -- tabla "tarjetas" + RLS + grants). Esta fase
-- conecta "tarjetas" con "movimientos" del lado de la base de datos: SOLO
-- backend, sin ningún cambio de código en src/ todavía (eso es Fase 3+).
--
-- Qué hace este script, EN ESTE ORDEN:
--   1. Agrega la columna "tarjeta_id" a "movimientos" (a quién se le cargó
--      el gasto, o a quién se le abonó un pago).
--   2. Agrega 'pago_tarjeta' como quinto valor válido de "movimientos.tipo".
--   3. Amplía "movimientos_traslado_forma_check" para que también valide la
--      forma correcta de un gasto-con-tarjeta y de un pago_tarjeta.
--   4. Crea la vista "tarjetas_con_deuda" (deuda y cupo disponible
--      CALCULADOS en vivo, nunca guardados -- mismo criterio que
--      "cuentas_con_saldo", ver supabase_saldo_calculado.sql).
--   5. Parchea "cuentas_con_saldo" para que un 'pago_tarjeta' también reste
--      del saldo de su cuenta de origen -- imprescindible, no opcional (ver
--      la explicación completa en el Paso 5, más abajo).
--
-- Estado real verificado ANTES de escribir este script (no se asume nada):
--   - "movimientos_tipo_check" hoy es exactamente:
--       check (tipo in ('ingreso', 'gasto', 'traslado', 'retiro'))
--     (quedó así después de supabase_tipo_retiro.sql; confirmado grepeando
--     todo sql/ -- ningún script posterior lo vuelve a tocar).
--   - "movimientos_traslado_forma_check" hoy es exactamente:
--       check (
--         (tipo = 'traslado' and cuenta_destino_id is not null and categoria_id is null)
--         or
--         (tipo <> 'traslado' and cuenta_destino_id is null)
--       )
--     (agregado en supabase_traslados.sql; supabase_tipo_retiro.sql lo
--     revisó y confirmó -- sin cambios -- que 'retiro' ya cae correctamente
--     en la segunda rama).
--   - Los nombres de ambos constraints están confirmados: si en tu base
--     fueran distintos (poco probable, Postgres los nombra automático y
--     nadie los renombró), el "drop constraint if exists" de abajo
--     simplemente no borra nada y el "add constraint" con el nombre nuevo
--     falla por choque de nombre -- se notaría de inmediato, no hay riesgo
--     de aplicar esto "a ciegas" sobre un nombre equivocado.
--
-- Seguro de ejecutar más de una vez: "add column if not exists", "create
-- index if not exists", "drop constraint if exists" antes de cada
-- alter/add constraint, "create or replace view". Sin DROP TABLE ni DELETE
-- en ningún punto.
-- ============================================================================


-- ============================================================================
-- PASO 1: columna "tarjeta_id" en "movimientos"
-- ============================================================================
-- Mismo patrón que "cuenta_destino_id" (supabase_traslados.sql): referencia
-- a tarjetas(id), nullable (la mayoría de movimientos NUNCA la usan -- solo
-- un 'gasto' pagado con tarjeta, o un 'pago_tarjeta').
--
-- "on delete set null": si se borrara la tarjeta, el movimiento histórico no
-- se borra, solo pierde la referencia. OJO -- esto es una red de seguridad
-- de la base, no el comportamiento esperado del flujo normal: el plan de
-- Fase 5 (pantalla "Pagar tarjeta") bloquea desde la UI borrar una tarjeta
-- con deuda > 0, así que en la práctica esto solo se activaría si alguien
-- borra la tarjeta saltándose la UI (API directa) o después de que su deuda
-- ya llegó a 0.
alter table public.movimientos
  add column if not exists tarjeta_id uuid references public.tarjetas(id) on delete set null;

create index if not exists movimientos_tarjeta_id_idx
  on public.movimientos (tarjeta_id);


-- ============================================================================
-- PASO 2: permitir 'pago_tarjeta' como tipo válido
-- ============================================================================
-- Mismo mecanismo que ya usaron supabase_traslados.sql (agregó 'traslado')
-- y supabase_tipo_retiro.sql (agregó 'retiro'): recrear el CHECK con el
-- valor nuevo sumado a la lista, sin tocar los 4 valores existentes.

alter table public.movimientos drop constraint if exists movimientos_tipo_check;

alter table public.movimientos
  add constraint movimientos_tipo_check
  check (tipo in ('ingreso', 'gasto', 'traslado', 'retiro', 'pago_tarjeta'));


-- ============================================================================
-- PASO 3: ampliar "movimientos_traslado_forma_check"
-- ============================================================================
-- El constraint original solo distinguía dos formas ("traslado" vs "todo lo
-- demás"). Ahora hay que distinguir CUATRO formas -- se escribe una rama OR
-- explícita por cada una, sin comparar booleanos con "!=" (más fácil de leer
-- y de auditar género por género):
--
--   - traslado:      cuenta_destino_id SÍ, categoria_id NO, tarjeta_id NO.
--                     (sin cambios de fondo respecto al constraint viejo,
--                     solo se le suma "tarjeta_id is null" para blindar que
--                     un traslado nunca traiga una tarjeta pegada por error.)
--   - pago_tarjeta:   cuenta_id SÍ (de dónde sale la plata), tarjeta_id SÍ
--                     (a cuál se abona), cuenta_destino_id NO, categoria_id
--                     NO (no es un gasto de categoría, ver reglas de
--                     negocio del plan).
--   - gasto:          cuenta_destino_id NO, y EXACTAMENTE UNO de
--                     (cuenta_id, tarjeta_id) -- un gasto sale de una cuenta
--                     de ahorro O se carga a una tarjeta, nunca ambas cosas
--                     a la vez ni ninguna de las dos.
--   - ingreso/retiro: cuenta_destino_id NO, tarjeta_id NO -- solo usan
--                     cuenta_id, igual que hoy (sin cambios de
--                     comportamiento para estos dos tipos).
--
-- Como "movimientos_tipo_check" (Paso 2) ya restringe "tipo" a exactamente
-- estos 5 valores, las 4 ramas de abajo son EXHAUSTIVAS -- no hay ningún
-- valor de "tipo" válido que no caiga en alguna rama.
alter table public.movimientos drop constraint if exists movimientos_traslado_forma_check;

alter table public.movimientos
  add constraint movimientos_traslado_forma_check
  check (
    (
      tipo = 'traslado'
      and cuenta_destino_id is not null
      and categoria_id is null
      and tarjeta_id is null
    )
    or
    (
      tipo = 'pago_tarjeta'
      and cuenta_id is not null
      and tarjeta_id is not null
      and cuenta_destino_id is null
      and categoria_id is null
    )
    or
    (
      tipo = 'gasto'
      and cuenta_destino_id is null
      and (
        (cuenta_id is not null and tarjeta_id is null)
        or
        (cuenta_id is null and tarjeta_id is not null)
      )
    )
    or
    (
      tipo in ('ingreso', 'retiro')
      and cuenta_destino_id is null
      and tarjeta_id is null
    )
  );

-- Nota sobre datos existentes: TODA fila de "movimientos" hoy tiene
-- tarjeta_id = null (la columna recién se creó en el Paso 1) y tipo en
-- ('ingreso', 'gasto', 'traslado', 'retiro'). Para esas filas:
--   - Un 'traslado' viejo ya cumplía la forma vieja (cuenta_destino_id no
--     null, categoria_id null) y tarjeta_id ya es null -> sigue cumpliendo.
--   - Un 'gasto' viejo SIEMPRE tiene cuenta_id not null (nunca hubo forma de
--     guardar uno sin cuenta) y tarjeta_id null -> cae en la rama
--     "(cuenta_id not null and tarjeta_id is null)" -> cumple.
--   - Un 'ingreso'/'retiro' viejo: cuenta_destino_id y tarjeta_id ya son
--     null -> cumple directo.
-- Es decir: este ALTER TABLE no debería poder fallar contra datos
-- existentes. Aun así, Postgres lo revalida solo al crear el constraint (no
-- hace falta una consulta de diagnóstico aparte, como si hizo falta en
-- supabase_reforzar_integridad.sql para los CHECK de montos) -- si alguna
-- fila violara esto, el ALTER TABLE fallaría con un error claro y nada
-- quedaría aplicado a medias.


-- ============================================================================
-- PASO 4: vista "tarjetas_con_deuda"
-- ============================================================================
-- Misma filosofía que "cuentas_con_saldo" (supabase_saldo_calculado.sql):
-- la deuda NUNCA se guarda ni se pisa, se recalcula en cada lectura a partir
-- de "movimientos" -- no puede quedar descuadrada ni sufrir condiciones de
-- carrera entre pestañas/sesiones.
--
-- deuda = suma de 'gasto' con esta tarjeta (SUMA la deuda) menos suma de
-- 'pago_tarjeta' a esta tarjeta (RESTA la deuda). Ningún otro tipo de
-- movimiento puede traer tarjeta_id -- ya lo garantiza el constraint del
-- Paso 3 -- así que el CASE de abajo no necesita contemplar otras ramas.
--
-- "with (security_invoker = true)" es la parte crítica de seguridad, igual
-- que en "cuentas_con_saldo": sin esto, la vista correría con los permisos
-- de quien la CREÓ, saltándose por completo RLS -- con security_invoker,
-- corre con los permisos y políticas de quien la consulta, así que un
-- usuario autenticado solo puede ver la deuda de SUS PROPIAS tarjetas
-- (protegido dos veces: por el "where mv.user_id = t.user_id" de abajo Y
-- por las políticas RLS de "tarjetas"/"movimientos" que ya exigen
-- auth.uid() = user_id).
--
-- "cantidad_movimientos" expone cuántos movimientos tiene la tarjeta -- útil
-- para una futura Fase de UI que quiera avisar antes de borrar una tarjeta
-- con historial (mismo espíritu que "cantidad_movimientos" ya usa
-- HojaCuenta.jsx para bloquear editar saldo_inicial), aunque el plan actual
-- ya bloquea el borrado por deuda > 0, no por cantidad_movimientos.
create or replace view public.tarjetas_con_deuda
  with (security_invoker = true)
as
select
  t.id,
  t.user_id,
  t.nombre,
  t.color,
  t.inicial,
  t.cupo_total,
  t.creado_en,
  coalesce(m.deuda, 0) as deuda,
  t.cupo_total - coalesce(m.deuda, 0) as cupo_disponible,
  coalesce(m.cantidad, 0) as cantidad_movimientos
from public.tarjetas t
left join lateral (
  select
    sum(
      case
        when mv.tipo = 'gasto' then mv.monto
        when mv.tipo = 'pago_tarjeta' then -mv.monto
      end
    ) as deuda,
    count(*) as cantidad
  from public.movimientos mv
  where mv.user_id = t.user_id
    and mv.tarjeta_id = t.id
) m on true;

comment on view public.tarjetas_con_deuda is
  'Tarjetas con deuda y cupo disponible calculados en vivo (suma de gastos con esa tarjeta menos pagos a esa tarjeta), nunca guardados. '
  'Leer esta vista en vez de "tarjetas" para mostrar deuda/cupo en la app (Fase 3+ del plan de tarjetas de crédito).';

-- Mismo permiso que ya tiene "cuentas_con_saldo" -- sin este grant, ningún
-- usuario autenticado podría leer la vista aunque RLS lo permitiera.
grant select on public.tarjetas_con_deuda to authenticated;


-- ============================================================================
-- PASO 5: parche a "cuentas_con_saldo" -- imprescindible, no opcional
-- ============================================================================
-- Se detectó revisando el JOIN de la vista (supabase_saldo_calculado.sql)
-- con lupa, tal como pediste: un 'pago_tarjeta' SÍ trae cuenta_id (la cuenta
-- de origen, de donde sale la plata) y por lo tanto SÍ cae dentro del
-- "where mv.cuenta_id = c.id or mv.cuenta_destino_id = c.id" de esa vista
-- -- pero su CASE de "efecto_neto" solo reconoce 'ingreso'/'gasto'/
-- 'retiro'/'traslado'. Sin esta rama nueva, un 'pago_tarjeta' caería en
-- NINGUNA de las ramas del CASE, este devolvería NULL para esa fila, y
-- sum() ignora los NULL -- es decir: la plata saldría de la tarjeta (deuda
-- baja bien, ver tarjetas_con_deuda) pero el saldo de la CUENTA DE AHORRO
-- de origen quedaría descuadrado (no le restaría el pago), justo el tipo de
-- bug que la Fase 1 del plan de saldo calculado (ver
-- supabase_saldo_calculado.sql) fue diseñada para eliminar.
--
-- Este parche es la única razón por la que este script toca una vista fuera
-- del "mundo tarjetas" -- es una consecuencia directa de que un
-- pago_tarjeta afecta DOS entidades a la vez (resta de una cuenta, resta de
-- una tarjeta), y "cuentas_con_saldo" ya existía antes de que 'pago_tarjeta'
-- fuera un tipo posible.
--
-- "cantidad_movimientos" de esa vista NO necesita ningún cambio: cuenta
-- filas con count(*) sobre el mismo WHERE, sin pasar por el CASE, así que
-- un pago_tarjeta YA se contaba correctamente ahí (y es lo correcto: un
-- pago de tarjeta es un movimiento real de esa cuenta, debe bloquear editar
-- su saldo_inicial igual que cualquier otro).
create or replace view public.cuentas_con_saldo
  with (security_invoker = true)
as
select
  c.id,
  c.user_id,
  c.nombre,
  c.tipo,
  c.color,
  c.inicial,
  c.es_ahorro,
  c.creado_en,
  c.saldo_inicial,
  c.saldo_inicial + coalesce(m.efecto_neto, 0) as saldo,
  coalesce(m.cantidad, 0) as cantidad_movimientos
from public.cuentas c
left join lateral (
  select
    sum(
      case
        when mv.tipo = 'ingreso' then mv.monto
        when mv.tipo = 'gasto' then -mv.monto
        when mv.tipo = 'retiro' then -mv.monto
        when mv.tipo = 'traslado' and mv.cuenta_id = c.id then -mv.monto
        when mv.tipo = 'traslado' and mv.cuenta_destino_id = c.id then mv.monto
        when mv.tipo = 'pago_tarjeta' and mv.cuenta_id = c.id then -mv.monto
      end
    ) as efecto_neto,
    count(*) as cantidad
  from public.movimientos mv
  where mv.user_id = c.user_id
    and (mv.cuenta_id = c.id or mv.cuenta_destino_id = c.id)
) m on true;

comment on view public.cuentas_con_saldo is
  'Cuentas con saldo calculado en vivo (saldo_inicial + efecto neto de sus movimientos), nunca guardado. '
  'Leer esta vista en vez de "cuentas" para mostrar saldos en la app (Fase 2 del plan de saldo calculado). '
  'Desde la Fase 2 del plan de tarjetas de crédito, un pago_tarjeta con cuenta_id = esta cuenta también resta.';

-- El grant a "authenticated" ya existía desde supabase_saldo_calculado.sql
-- (grant select on public.cuentas_con_saldo to authenticated) -- "create or
-- replace view" no toca los permisos ya otorgados, así que no hace falta
-- repetirlo. Se deja como comentario solo para que quede documentado que se
-- revisó, no porque haga falta ejecutarlo:
-- grant select on public.cuentas_con_saldo to authenticated;


-- ============================================================================
-- VERIFICACIÓN (correr esto después de todo lo anterior)
-- ============================================================================

-- 1) El CHECK de tipo debe incluir 'pago_tarjeta' junto a los 4 valores
--    existentes.
-- select conname, pg_get_constraintdef(oid) as definicion
-- from pg_constraint
-- where conrelid = 'public.movimientos'::regclass
--   and conname = 'movimientos_tipo_check';

-- 2) El CHECK de forma debe mostrar las 4 ramas nuevas (traslado /
--    pago_tarjeta / gasto / ingreso-retiro).
-- select conname, pg_get_constraintdef(oid) as definicion
-- from pg_constraint
-- where conrelid = 'public.movimientos'::regclass
--   and conname = 'movimientos_traslado_forma_check';

-- 3) La vista existe y expone las columnas esperadas.
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'tarjetas_con_deuda'
-- order by ordinal_position;

-- 4) "authenticated" puede leer la vista.
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'tarjetas_con_deuda' and grantee = 'authenticated';

-- 5) Prueba funcional completa (con un usuario logueado; reemplaza
--    '<tu-cuenta-id>' por el id de una cuenta tuya real, o quita esa parte
--    si solo quieres probar el gasto con tarjeta sin el pago):
--
-- -- 5a) Crear una tarjeta de prueba con cupo 1.000.000
-- insert into public.tarjetas (user_id, nombre, color, inicial, cupo_total)
-- values (auth.uid(), 'Tarjeta de prueba', '#5aa9e6', 'T', 1000000)
-- returning id; -- guarda este id como '<tarjeta-id>' para los pasos siguientes
--
-- -- 5b) Un gasto de 100.000 con esa tarjeta (sube la deuda a 100.000)
-- insert into public.movimientos (user_id, tipo, descripcion, monto, tarjeta_id, categoria_id, fecha)
-- values (auth.uid(), 'gasto', 'Gasto de prueba con tarjeta', 100000, '<tarjeta-id>', null, current_date);
--
-- -- 5c) Ver la deuda: debe dar deuda = 100000, cupo_disponible = 900000
-- select * from public.tarjetas_con_deuda where id = '<tarjeta-id>';
--
-- -- 5d) Un pago parcial de 40.000 desde una cuenta propia (baja la deuda a 60.000)
-- insert into public.movimientos (user_id, tipo, descripcion, monto, cuenta_id, tarjeta_id, fecha)
-- values (auth.uid(), 'pago_tarjeta', 'Pago de prueba', 40000, '<tu-cuenta-id>', '<tarjeta-id>', current_date);
--
-- -- 5e) Ver la deuda de nuevo: debe dar deuda = 60000, cupo_disponible = 940000
-- select * from public.tarjetas_con_deuda where id = '<tarjeta-id>';
--
-- -- 5f) CRÍTICO -- confirmar el parche del Paso 5: el saldo de
-- --     '<tu-cuenta-id>' en cuentas_con_saldo debe haber bajado en 40000
-- --     (el monto del pago) respecto a como estaba ANTES del paso 5d. Si no
-- --     bajó, el parche a cuentas_con_saldo no se aplicó bien -- no sigas
-- --     sin resolver esto.
-- select id, nombre, saldo, cantidad_movimientos
-- from public.cuentas_con_saldo
-- where id = '<tu-cuenta-id>';
--
-- -- 5g) Limpieza: borrar los movimientos de prueba y la tarjeta de prueba
-- delete from public.movimientos where descripcion in ('Gasto de prueba con tarjeta', 'Pago de prueba');
-- delete from public.tarjetas where nombre = 'Tarjeta de prueba';
--
-- -- 5h) Confirmar que la limpieza también dejó el saldo de esa cuenta
-- --     exactamente como estaba antes de empezar la prueba (5f + 40000).
-- select id, nombre, saldo, cantidad_movimientos
-- from public.cuentas_con_saldo
-- where id = '<tu-cuenta-id>';

-- 6) (Opcional) Confirmar que el CHECK de forma RECHAZA combinaciones
--    inválidas -- cada uno de estos 3 inserts debe fallar con un error de
--    "violates check constraint movimientos_traslado_forma_check":
--
-- -- 6a) Gasto con cuenta Y tarjeta a la vez (debe fallar)
-- insert into public.movimientos (user_id, tipo, descripcion, monto, cuenta_id, tarjeta_id, fecha)
-- values (auth.uid(), 'gasto', 'no debería insertarse', 1000, '<tu-cuenta-id>', '<tarjeta-id>', current_date);
--
-- -- 6b) Gasto sin cuenta NI tarjeta (debe fallar)
-- insert into public.movimientos (user_id, tipo, descripcion, monto, fecha)
-- values (auth.uid(), 'gasto', 'no debería insertarse', 1000, current_date);
--
-- -- 6c) pago_tarjeta sin tarjeta_id (debe fallar)
-- insert into public.movimientos (user_id, tipo, descripcion, monto, cuenta_id, fecha)
-- values (auth.uid(), 'pago_tarjeta', 'no debería insertarse', 1000, '<tu-cuenta-id>', current_date);


-- ============================================================================
-- Fin del script.
--
-- Qué NO hace este script (a propósito -- fases siguientes del plan):
--   - No modifica ningún archivo de src/ -- la app todavía no sabe que
--     "tarjeta_id" ni 'pago_tarjeta' existen (HojaNuevoMovimiento.jsx sigue
--     mandando solo cuenta_id, así que sigue funcionando exactamente igual
--     que hoy).
--   - No agrega ningún bloqueo de "no borrar tarjeta con deuda" -- eso es
--     una regla de UI (Fase 5), no de la base de datos en esta fase.
--
-- Qué SÍ toca fuera del "mundo tarjetas" (y por qué era imprescindible):
--   - "cuentas_con_saldo" (Paso 5): un 'pago_tarjeta' tiene cuenta_id (la
--     cuenta de origen) y por lo tanto entra al JOIN de esa vista -- sin la
--     rama nueva en su CASE, el saldo de esa cuenta habría quedado mal
--     calculado en cuanto existiera un pago_tarjeta real. Se detectó
--     revisando la vista antes de cerrar este script, no estaba en el plan
--     original de la Fase 2 -- ver el Paso 5 para el detalle completo.
-- ============================================================================
