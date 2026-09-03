-- ============================================================================
-- supabase_saldo_calculado.sql
--
-- FASE 1 del plan "saldo calculado" (ver conversación de diagnóstico de
-- saldos + plan de fases). Puramente ADITIVO: agrega una columna nueva,
-- hace un backfill que NO cambia ningún número visible hoy, y crea una
-- vista de solo lectura. No modifica ni borra ninguna columna existente,
-- no toca "cuentas.saldo" (la columna vieja sigue funcionando exactamente
-- igual que hoy) y no requiere ningún cambio de código en la app todavía
-- -- eso es la Fase 2 del plan.
--
-- Qué resuelve: hoy "cuentas.saldo" es un solo valor que se sobreescribe
-- de forma incremental en cada movimiento (ver diagnóstico), sin
-- distinguir "el saldo con el que nace la cuenta" de "el saldo de hoy".
-- Este script separa las dos cosas:
--
--   - "saldo_inicial" (columna nueva, GUARDADA): el ancla. Se escribe una
--     sola vez al crear la cuenta y, a partir de la Fase 5 del plan,
--     queda bloqueada en la UI si la cuenta ya tiene movimientos.
--
--   - "saldo" (columna CALCULADA, expuesta por la vista nueva
--     "cuentas_con_saldo"): saldo_inicial + el efecto neto de todos los
--     movimientos de esa cuenta. Nunca se guarda ni se pisa -- se
--     recalcula en cada lectura, así que no puede quedar "descuadrado"
--     ni sufrir condiciones de carrera entre pestañas/sesiones (no hay
--     nada mutable que una pestaña con datos viejos pueda sobreescribir).
--
-- Seguro de ejecutar más de una vez: "add column if not exists", el
-- backfill solo toca filas con saldo_inicial todavía en null, "create
-- index if not exists" y la vista usa "create or replace view". Sin DROP
-- ni DELETE en ningún punto.
-- ============================================================================


-- ============================================================================
-- PASO 1: columna nueva "saldo_inicial" en "cuentas"
-- ============================================================================
-- Se agrega SIN "not null" todavía -- recién se exige en el PASO 3,
-- después de que el backfill del PASO 2 le haya puesto un valor a cada
-- fila existente. Si se pusiera "not null" desde ya, este "alter table"
-- fallaría para cualquier cuenta que ya exista (todas, hoy).
alter table public.cuentas
  add column if not exists saldo_inicial numeric(14, 2);


-- ============================================================================
-- PASO 2: backfill NEUTRO
-- ============================================================================
-- Objetivo: que, para CADA cuenta, se cumpla la ecuación
--
--     saldo_inicial + efecto_neto_de_sus_movimientos = saldo actual
--     (la columna vieja "saldo", tal como está guardada HOY)
--
-- Es decir: este backfill despeja "saldo_inicial" de esa ecuación -- el
-- número que el usuario ve en pantalla NO cambia con este script, esté la
-- cuenta limpia o ya descuadrada por una edición manual con movimientos
-- de por medio (ese descuadre de fondo, si existe, se corrige después con
-- la función de "reiniciar datos" de la Fase 6/7 del plan; este script no
-- lo intenta arreglar, solo lo deja matemáticamente transparente).
--
-- "efecto" replica exactamente la misma regla que ya usa el código de la
-- app hoy (esEntradaEnCuenta en src/utils/movimientosCuenta.js):
--   - ingreso                                -> entra  (+monto)
--   - gasto                                  -> sale   (-monto)
--   - traslado, visto desde cuenta_id (origen)         -> sale  (-monto)
--   - traslado, visto desde cuenta_destino_id (destino)-> entra (+monto)
--
-- "retiro" no puede existir todavía en datos reales -- el constraint
-- movimientos_tipo_check solo permite ingreso/gasto/traslado hasta la
-- Fase 4 del plan -- así que no hace falta contemplarlo en este backfill.
with efectos as (
  -- Lado "cuenta_id": un ingreso o un gasto pertenecen enteros a esta
  -- cuenta; un traslado, visto desde su cuenta ORIGEN, sale (resta).
  select
    cuenta_id as cuenta_id,
    case tipo
      when 'ingreso'  then monto
      when 'gasto'    then -monto
      when 'traslado' then -monto
    end as efecto
  from public.movimientos
  where cuenta_id is not null

  union all

  -- Lado "cuenta_destino_id": solo lo usan los traslados, y desde la
  -- cuenta DESTINO siempre entra (suma).
  select
    cuenta_destino_id as cuenta_id,
    monto as efecto
  from public.movimientos
  where tipo = 'traslado' and cuenta_destino_id is not null
),
suma_por_cuenta as (
  select cuenta_id, sum(efecto) as suma_movimientos
  from efectos
  group by cuenta_id
)
update public.cuentas c
set saldo_inicial = c.saldo - suma_por_cuenta.suma_movimientos
from suma_por_cuenta
where suma_por_cuenta.cuenta_id = c.id
  and c.saldo_inicial is null;

-- Cuentas SIN ningún movimiento (no aparecen en "suma_por_cuenta" -- el
-- UPDATE de arriba no las toca, así que siguen con saldo_inicial en null
-- después de él): su saldo_inicial es, directamente, su saldo actual --
-- no hay ningún movimiento que restar.
update public.cuentas
set saldo_inicial = saldo
where saldo_inicial is null;


-- ============================================================================
-- PASO 3: "saldo_inicial" pasa a ser obligatoria
-- ============================================================================
-- Recién ahora es seguro exigir "not null" -- el PASO 2 ya le puso un
-- valor a cada fila existente, sin excepción. "default 0" es solo una red
-- de seguridad para cuentas NUEVAS que se creen sin mandar el campo
-- explícitamente (el flujo normal de agregarCuenta() en services/cuentas.js
-- siempre lo manda).
alter table public.cuentas
  alter column saldo_inicial set not null;

alter table public.cuentas
  alter column saldo_inicial set default 0;


-- ============================================================================
-- PASO 4: índice de apoyo para la vista del PASO 5
-- ============================================================================
-- La vista busca, por cada cuenta, sus movimientos por "cuenta_id" (lado
-- origen) O "cuenta_destino_id" (lado destino). Ya existe un índice sobre
-- "cuenta_destino_id" (movimientos_cuenta_destino_id_idx, creado en
-- supabase_traslados.sql), pero nunca se creó uno sobre "cuenta_id" --
-- sin este índice, cada carga de "cuentas_con_saldo" forzaría un
-- recorrido completo de "movimientos" por cada cuenta consultada.
create index if not exists movimientos_cuenta_id_idx
  on public.movimientos (cuenta_id);


-- ============================================================================
-- PASO 5: vista "cuentas_con_saldo"
-- ============================================================================
-- Expone cada cuenta con su saldo CALCULADO en vivo (nunca guardado), más
-- "cantidad_movimientos" (para la Fase 5 del plan: bloquear la edición de
-- saldo_inicial en la UI cuando la cuenta ya tiene movimientos).
--
-- "with (security_invoker = true)" es la parte crítica de seguridad: sin
-- esto, una vista corre con los permisos de quien la CREÓ (el dueño del
-- esquema), lo que se saltaría por completo las políticas RLS de
-- "cuentas" y "movimientos" -- cualquier usuario autenticado podría
-- terminar viendo saldos ajenos. Con security_invoker, la vista corre con
-- los permisos y las políticas RLS de quien la está consultando en ese
-- momento, igual que si esa persona hiciera el select directamente sobre
-- las tablas (tal como ya las protege supabase_etapa3_rls.sql hoy).
-- Requiere Postgres 15+; este proyecto corre 17.6, así que está soportado.
--
-- La columna calculada se llama, a propósito, "saldo" (no "saldo_actual"
-- ni otro nombre distinto): así, en la Fase 2 del plan, la app solo
-- cambia DE QUÉ TABLA lee ("cuentas" -> "cuentas_con_saldo") sin tocar ni
-- una sola línea de los componentes que ya hacen "cuenta.saldo" hoy
-- (Home.jsx, DetalleCuenta.jsx, GestionCuentas.jsx, components/Cuenta.jsx,
-- HojaElegirCuentaPago.jsx, Emergencia.jsx).
--
-- La rama 'retiro' ya está incluida en el CASE de abajo aunque el
-- constraint de "movimientos.tipo" todavía no permite ese valor (eso
-- llega en la Fase 4 del plan) -- así se evita tener que volver a tocar
-- esta vista solo para agregar una rama más adelante. Nota: si algún día
-- se agrega un tipo de movimiento nuevo SIN actualizar este CASE, ese
-- movimiento no rompe nada -- el CASE devuelve null para esa fila, sum()
-- ignora los null, y ese movimiento simplemente no afecta el saldo
-- calculado hasta que se actualice esta vista (falla "callado", no con
-- un error; vale la pena recordarlo al agregar tipos nuevos).
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
      end
    ) as efecto_neto,
    count(*) as cantidad
  from public.movimientos mv
  where mv.user_id = c.user_id
    and (mv.cuenta_id = c.id or mv.cuenta_destino_id = c.id)
) m on true;

comment on view public.cuentas_con_saldo is
  'Cuentas con saldo calculado en vivo (saldo_inicial + efecto neto de sus movimientos), nunca guardado. '
  'Leer esta vista en vez de "cuentas" para mostrar saldos en la app (Fase 2 del plan de saldo calculado).';

-- Mismo permiso que ya tienen el resto de tablas de datos (ver
-- supabase_permisos_dev.sql) -- sin este grant, ningún usuario
-- autenticado podría leer la vista aunque RLS lo permitiera.
grant select on public.cuentas_con_saldo to authenticated;


-- ============================================================================
-- VERIFICACIÓN (correr después de todo lo anterior, antes de dar la Fase 1
-- por terminada)
-- ============================================================================
-- Debe devolver 0 FILAS. Si devuelve alguna, algo en el backfill o en el
-- CASE de la vista está mal -- no conviene avanzar a la Fase 2 del plan
-- (que hace que la app empiece a leer de esta vista) hasta que esto dé
-- vacío.
select
  v.id,
  v.nombre,
  v.saldo as saldo_vista,
  c.saldo as saldo_columna_vieja,
  v.saldo - c.saldo as diferencia
from public.cuentas_con_saldo v
join public.cuentas c on c.id = v.id
where v.saldo <> c.saldo;


-- ============================================================================
-- Fin del script.
--
-- Qué NO hace este script (a propósito, por diseño de la Fase 1):
--   - No toca la columna vieja "cuentas.saldo" -- sigue existiendo, y el
--     código actual (services/movimientos.js, services/gastosFijos.js) la
--     sigue leyendo y escribiendo exactamente igual que hoy. Deja de
--     escribirse recién en la Fase 3 del plan.
--   - No cambia ningún archivo de src/ -- la app sigue leyendo la tabla
--     "cuentas" (no la vista "cuentas_con_saldo") hasta la Fase 2.
--   - No agrega 'retiro' como valor válido de "movimientos.tipo" -- eso
--     es la Fase 4 (requiere tocar movimientos_tipo_check). La vista ya
--     lo contempla, pero la base seguirá rechazando esa fila hasta
--     entonces.
-- ============================================================================
