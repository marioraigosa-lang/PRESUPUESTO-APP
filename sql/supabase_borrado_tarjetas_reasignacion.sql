-- ============================================================================
-- supabase_borrado_tarjetas_reasignacion.sql
--
-- ✅ APLICADO en Supabase el 2026-09-06. Verificado: FK
-- movimientos_tarjeta_id_fkey en ON DELETE RESTRICT, vista tarjetas_con_deuda
-- expone cantidad_gastos/total_pagado/total_gastado, función
-- eliminar_tarjeta_usuario creada. Se deja el detalle completo de los PASOS
-- y las VERIFICACIONES tal cual se escribieron ANTES de correrlo, como
-- referencia de qué se verificó y por qué.
--
-- ============================================================================
-- QUÉ RESUELVE Y POR QUÉ REEMPLAZA AL SCRIPT ANTERIOR
-- ============================================================================
-- El borrado de una tarjeta con movimientos pasó por tres modelos:
--
--   1. "on delete set null" (original, supabase_tarjetas_movimientos.sql):
--      al borrar la tarjeta, sus gastos/pagos quedaban con tarjeta_id = null
--      -> violaban movimientos_traslado_forma_check -> el DELETE fallaba.
--      BUG.
--
--   2. "on delete cascade" (supabase_fix_borrado_tarjetas.sql): al borrar la
--      tarjeta se borraban TODOS sus movimientos, incluidos los pagos. Como
--      los pagos tienen cuenta_id, el saldo de esas cuentas "recuperaba" ese
--      dinero -- la app pasaba a comportarse como si esos pagos nunca
--      hubieran ocurrido. El usuario replanteó el modelo: eso NO es correcto.
--
--   3. REASIGNACIÓN (este script, modelo final confirmado con el usuario):
--      una tarjeta solo se puede borrar si su deuda es EXACTAMENTE 0 (todo
--      pagado). Al borrarla:
--        - Los GASTOS hechos con la tarjeta se REASIGNAN a la cuenta desde
--          la que se pagó: pasan de "gasto con tarjeta_id" a "gasto con
--          cuenta_id". Así SE CONSERVAN en el historial (siguen contando en
--          sus categorías y en su mes) y quedan cargados a la cuenta que de
--          verdad pagó ese consumo.
--        - Los PAGOS (pago_tarjeta) se ELIMINAN: ya no hacen falta, porque
--          ahora los gastos salen directamente de la cuenta. Mantenerlos
--          restaría dos veces.
--        - El patrimonio total NO cambia. Como deuda = 0 => Σ(gastos) =
--          Σ(pagos), lo que baja la cuenta reasignada por los gastos es
--          igual a lo que suben las cuentas pagadoras al quitarse sus pagos.
--          (Si todos los pagos salieron de UNA sola cuenta y se reasigna a
--          esa misma cuenta, ni siquiera cambia ningún saldo individual: el
--          -Σgastos se cancela con el +Σpagos de esa cuenta.)
--
-- Este script deja "supabase_fix_borrado_tarjetas.sql" (modelo 2) SUPERADO
-- -- ver la nota que se agrega en su cabecera y en sql/README.md.
--
-- ============================================================================
-- ESTADO DEL QUE PARTE ESTE SCRIPT
-- ============================================================================
-- Se ASUME que "movimientos_tarjeta_id_fkey" está hoy en ON DELETE CASCADE
-- (modelo 2, que el usuario indicó como ejecutado). El PASO 0 lo confirma.
-- De todas formas el PASO 1 usa "drop constraint if exists" + "add
-- constraint", así que deja la FK en RESTRICT sin importar si venía de
-- CASCADE o de SET NULL.
--
-- OJO -- dato existente a revisar ANTES de aplicar: si desde que se ejecutó
-- el modelo 2 (cascade) se borró ALGUNA tarjeta que tuviera gastos y pagos,
-- esa cascada ya borró esos pagos y el saldo de las cuentas pagadoras quedó
-- inflado (y se perdieron gastos del historial). Este script NO puede
-- reparar eso hacia atrás. La consulta de la VERIFICACIÓN punto 3 ayuda a
-- detectar inconsistencias, pero lo más seguro es confirmar con el propio
-- usuario si borró alguna tarjeta en esa ventana. Si no borró ninguna (lo
-- esperado, porque estamos rediseñando antes de usar la feature), no hay
-- nada que reparar.
--
-- Seguro de ejecutar más de una vez: "drop constraint if exists" antes del
-- add, "create or replace view", "create or replace function". Sin DROP
-- TABLE ni DELETE sueltos (los DELETE/UPDATE viven DENTRO de la función y
-- solo corren cuando alguien la llama con una tarjeta concreta).
-- ============================================================================


-- ============================================================================
-- PASO 0: VERIFICAR EL NOMBRE REAL DE LA FK -- CORRER ESTO PRIMERO, SOLO,
-- ANTES DE TOCAR NADA
-- ============================================================================
-- "movimientos.tarjeta_id" se creó con "references public.tarjetas(id) ..."
-- dentro de un ADD COLUMN (supabase_tarjetas_movimientos.sql, PASO 1), sin
-- nombrar la FK -> Postgres le puso el nombre por defecto
-- "movimientos_tarjeta_id_fkey". Confirmarlo acá y comparar contra el nombre
-- usado en el PASO 1. Si no coincide, ajustar el DROP/ADD de abajo.

select
  conname as nombre_constraint,
  pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.movimientos'::regclass
  and contype = 'f' -- 'f' = foreign key
order by conname;

-- Se espera ver, entre otras:
--   movimientos_tarjeta_id_fkey          ... REFERENCES tarjetas(id) ON DELETE CASCADE   (modelo 2)
--   movimientos_cuenta_id_fkey           ... REFERENCES cuentas(id)  ON DELETE CASCADE   (supabase_fix_borrado_cuentas.sql)
--   movimientos_cuenta_destino_id_fkey   ... REFERENCES cuentas(id)  ON DELETE CASCADE   (idem)


-- ============================================================================
-- PASO 1: FK "movimientos.tarjeta_id" -- de ON DELETE CASCADE a ON DELETE RESTRICT
-- ============================================================================
-- POR QUÉ RESTRICT (y no CASCADE ni SET NULL):
--
-- La función del PASO 3 se encarga de TODO antes de borrar la tarjeta:
-- reasigna los gastos (tarjeta_id -> null) y borra los pagos. Cuando llega
-- al "delete from tarjetas", NINGUNA fila de "movimientos" referencia ya la
-- tarjeta -- así que el modo de la FK, en el camino feliz, no se ejerce
-- nunca.
--
-- RESTRICT es un BACKSTOP para el camino NO feliz: si algún día la función
-- tuviera un bug y dejara una fila colgando (un gasto sin reasignar, un
-- pago sin borrar), RESTRICT hace que el "delete from tarjetas" FALLE
-- RUIDOSAMENTE (y aborte toda la transacción) en vez de:
--   - CASCADE: arrastrar en silencio el borrado de gastos/pagos REALES
--     (pérdida de datos sin aviso).
--   - SET NULL: dejar la fila en una forma inválida (cuenta_id null y
--     tarjeta_id null en un gasto, o pago_tarjeta con tarjeta_id null) que
--     recién explota, con un error confuso de CHECK, un paso después.
--
-- RESTRICT no es "deferrable", pero acá no hace falta: dentro de la función
-- el UPDATE y el DELETE de "movimientos" se aplican ANTES del "delete from
-- tarjetas" en la misma transacción, así que para cuando la FK se evalúa ya
-- no hay filas que la violen.

alter table public.movimientos
  drop constraint if exists movimientos_tarjeta_id_fkey;

alter table public.movimientos
  add constraint movimientos_tarjeta_id_fkey
  foreign key (tarjeta_id) references public.tarjetas(id) on delete restrict;


-- ============================================================================
-- PASO 2: vista "tarjetas_con_deuda" -- agregar cantidad_gastos, total_pagado
-- y total_gastado
-- ============================================================================
-- Se agregan 3 columnas y se mantiene TODO lo que ya exponía (deuda,
-- cupo_disponible, cantidad_movimientos, etc.). "create or replace view"
-- conserva los grants existentes; igual se re-otorga al final por si acaso
-- (es idempotente).
--
--   - cantidad_gastos: cuántos movimientos tipo 'gasto' tiene la tarjeta.
--     La app (Fase 3 del rediseño) lo usa para decidir si, al borrar la
--     tarjeta, hay que pedirle al usuario una cuenta de reasignación
--     (cantidad_gastos > 0) o si se puede borrar directo (cantidad_gastos = 0).
--   - total_pagado: suma de los 'pago_tarjeta' a esta tarjeta. Útil para el
--     texto de la pantalla de borrado y para elegir la cuenta pagadora por
--     defecto.
--   - total_gastado: suma de los 'gasto' con esta tarjeta. Aditivo -- hoy
--     DetalleTarjeta.jsx calcula esto en el cliente pero solo del mes
--     visible; tener el total acumulado en la vista es gratis (misma
--     pasada) y evita esa cuenta a mano más adelante.
--
-- Nota sobre el CASE de "deuda": ningún tipo distinto de 'gasto' /
-- 'pago_tarjeta' puede traer tarjeta_id (lo garantiza
-- movimientos_traslado_forma_check), así que el CASE de dos ramas es
-- exhaustivo -- igual que en la versión original.

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
  coalesce(m.cantidad, 0) as cantidad_movimientos,
  coalesce(m.cantidad_gastos, 0) as cantidad_gastos,
  coalesce(m.total_pagado, 0) as total_pagado,
  coalesce(m.total_gastado, 0) as total_gastado
from public.tarjetas t
left join lateral (
  select
    sum(
      case
        when mv.tipo = 'gasto' then mv.monto
        when mv.tipo = 'pago_tarjeta' then -mv.monto
      end
    ) as deuda,
    count(*) as cantidad,
    count(*) filter (where mv.tipo = 'gasto') as cantidad_gastos,
    sum(mv.monto) filter (where mv.tipo = 'pago_tarjeta') as total_pagado,
    sum(mv.monto) filter (where mv.tipo = 'gasto') as total_gastado
  from public.movimientos mv
  where mv.user_id = t.user_id
    and mv.tarjeta_id = t.id
) m on true;

comment on view public.tarjetas_con_deuda is
  'Tarjetas con deuda y cupo disponible calculados en vivo (suma de gastos con esa tarjeta menos pagos a esa tarjeta), nunca guardados. '
  'Expone tambien cantidad_gastos / total_pagado / total_gastado para el flujo de borrado con reasignacion (ver sql/supabase_borrado_tarjetas_reasignacion.sql). '
  'Leer esta vista en vez de "tarjetas" para mostrar deuda/cupo en la app.';

grant select on public.tarjetas_con_deuda to authenticated;


-- ============================================================================
-- PASO 3: función "eliminar_tarjeta_usuario"
-- ============================================================================
-- Borra una tarjeta del usuario que llama, en UNA transacción (automático
-- en una función plpgsql: si cualquier paso lanza excepción, TODO se
-- revierte -- ni la reasignación, ni el borrado de pagos, ni el de la
-- tarjeta quedan a medias).
--
-- SECURITY INVOKER (no DEFINER), igual que reiniciar_datos_usuario: la
-- función corre con los permisos y las políticas RLS de auth.uid(), como si
-- el cliente hiciera los UPDATE/DELETE directo. Los "where user_id =
-- auth.uid()" de abajo son la MISMA condición que ya exigen las políticas de
-- supabase_etapa3_rls.sql, escrita explícita en la función -- no un
-- reemplazo de RLS, una capa más.
--
-- PARÁMETROS:
--   p_tarjeta_id        -- la tarjeta a borrar.
--   p_cuenta_destino_id -- a qué cuenta reasignar los gastos. Obligatorio
--                          SOLO si la tarjeta tiene gastos; si no tiene, se
--                          ignora (puede venir null).
--
-- ERRORES (se propagan como el "message" del error de supabase.rpc()):
--   SIN_SESION               -- auth.uid() es null.
--   FALTA_TARJETA            -- p_tarjeta_id es null.
--   TARJETA_INVALIDA         -- la tarjeta no existe o no es del usuario.
--   TARJETA_DEUDA_NO_CERO    -- la deuda calculada != 0.
--   FALTA_CUENTA_DESTINO     -- hay gastos pero no se pasó p_cuenta_destino_id.
--   CUENTA_DESTINO_INVALIDA  -- p_cuenta_destino_id no existe o no es del usuario.
--   BORRADO_INESPERADO       -- el DELETE final no tocó exactamente 1 fila.
--
-- POR QUÉ EL ORDEN ES a -> b -> c -> d -> e:
--   a/b antes que nada: si la deuda no es 0 hay que abortar SIN tocar una
--       sola fila (no reasignar ni borrar nada).
--   c (reasignar gastos) ANTES de d/e: deja los gastos con cuenta_id y sin
--       tarjeta_id -> forma válida, y ya no referencian la tarjeta.
--   d (borrar pagos) ANTES de e: quita las últimas filas que referencian la
--       tarjeta (los únicos tipos que pueden tener tarjeta_id son 'gasto' --
--       ya reasignado -- y 'pago_tarjeta' -- borrado acá).
--   e (borrar la tarjeta) al final: para cuando corre, la FK
--       movimientos_tarjeta_id_fkey (ON DELETE RESTRICT) no encuentra
--       ninguna fila que la referencie -> el DELETE pasa limpio.
--   Si se hiciera al revés (borrar la tarjeta primero), RESTRICT lo
--       rechazaría, o -- con la FK vieja en CASCADE -- se llevaría por
--       delante los pagos que justamente queremos conservar como el efecto
--       en la cuenta.

create or replace function public.eliminar_tarjeta_usuario(
  p_tarjeta_id uuid,
  p_cuenta_destino_id uuid default null
)
returns void
language plpgsql
security invoker
as $$
declare
  v_uid          uuid := auth.uid();
  v_deuda        numeric;
  v_tiene_gastos boolean;
  v_filas        integer;
begin
  -- Guarda 0: sesión activa + argumento mínimo.
  if v_uid is null then
    raise exception 'SIN_SESION'
      using hint = 'No hay un usuario autenticado (auth.uid() es null).';
  end if;

  if p_tarjeta_id is null then
    raise exception 'FALTA_TARJETA'
      using hint = 'p_tarjeta_id no puede ser null.';
  end if;

  -- Guarda 1: la tarjeta existe y es del usuario que llama. RLS
  -- (security invoker) ya lo garantizaría, pero el chequeo explícito da un
  -- error claro en vez de un "borré 0 filas" silencioso en el paso e.
  if not exists (
    select 1
    from public.tarjetas
    where id = p_tarjeta_id
      and user_id = v_uid
  ) then
    raise exception 'TARJETA_INVALIDA'
      using hint = 'La tarjeta no existe o no pertenece al usuario.';
  end if;

  -- Paso a) Recalcular la deuda DESDE "movimientos" -- nunca confiar en un
  -- valor que venga del cliente. Fórmula EXACTA de la vista
  -- tarjetas_con_deuda: + gasto, - pago_tarjeta. Ningún otro tipo puede
  -- traer tarjeta_id (movimientos_traslado_forma_check), así que el CASE no
  -- necesita más ramas. coalesce por si no hay ninguna fila (sum() da null).
  select coalesce(sum(
           case
             when tipo = 'gasto'        then monto
             when tipo = 'pago_tarjeta' then -monto
           end
         ), 0)
    into v_deuda
  from public.movimientos
  where tarjeta_id = p_tarjeta_id
    and user_id = v_uid;

  -- Paso b) Solo se puede borrar una tarjeta SALDADA (deuda exactamente 0).
  -- "monto" es numeric(14,2) y la suma es aritmética exacta en Postgres, así
  -- que "<> 0" alcanzaría; la tolerancia de medio centavo es un cinturón
  -- extra sin costo. Cubre deuda > 0 (falta pagar) y deuda < 0 (se pagó de
  -- más, o se borró a mano un gasto ya pagado) -- ambos casos se bloquean.
  if abs(v_deuda) >= 0.005 then
    raise exception 'TARJETA_DEUDA_NO_CERO'
      using hint = format('La deuda calculada es %s; debe ser 0 para eliminar la tarjeta.', v_deuda);
  end if;

  -- Paso c) ¿La tarjeta tiene GASTOS? (consumos que suben la deuda). Si los
  -- tiene, hay que reasignarlos a una cuenta real antes de borrar la
  -- tarjeta: un gasto con tarjeta_id NO tiene cuenta_id, y si la tarjeta
  -- desaparece dejándolo huérfano viola movimientos_traslado_forma_check.
  select exists (
    select 1
    from public.movimientos
    where tarjeta_id = p_tarjeta_id
      and user_id = v_uid
      and tipo = 'gasto'
  ) into v_tiene_gastos;

  if v_tiene_gastos then
    if p_cuenta_destino_id is null then
      raise exception 'FALTA_CUENTA_DESTINO'
        using hint = 'La tarjeta tiene gastos; hay que indicar a que cuenta reasignarlos.';
    end if;

    if not exists (
      select 1
      from public.cuentas
      where id = p_cuenta_destino_id
        and user_id = v_uid
    ) then
      raise exception 'CUENTA_DESTINO_INVALIDA'
        using hint = 'La cuenta de reasignacion no existe o no pertenece al usuario.';
    end if;

    -- Reasignar: el gasto pasa de "cargado a la tarjeta" a "cargado a la
    -- cuenta que realmente la pagó". Conserva monto, fecha, categoria_id,
    -- descripcion y emoji -> sigue contando IGUAL en los reportes por
    -- categoría y en su mes. Queda: tipo = 'gasto', cuenta_id not null,
    -- tarjeta_id null, cuenta_destino_id null -> cae en la rama válida
    -- "(cuenta_id is not null and tarjeta_id is null)" de
    -- movimientos_traslado_forma_check. NO hace falta tocar ese constraint.
    --
    -- WHERE deliberadamente estricto: user_id (del usuario) + tarjeta_id
    -- (de esta tarjeta) + tipo = 'gasto' (NO tocar los pago_tarjeta, que se
    -- borran en el paso d; ponerles tarjeta_id null los dejaría violando su
    -- rama del constraint).
    update public.movimientos
       set cuenta_id  = p_cuenta_destino_id,
           tarjeta_id = null
     where tarjeta_id = p_tarjeta_id
       and user_id    = v_uid
       and tipo       = 'gasto';
  end if;

  -- Paso d) Borrar los PAGOS a esta tarjeta. Ya no hacen falta: los gastos
  -- ahora salen directamente de la cuenta (paso c), mantener los pagos
  -- restaría dos veces. Como deuda = 0 => Σ(gastos) = Σ(pagos), el efecto
  -- neto sobre el patrimonio total es cero.
  --
  -- WHERE estricto: user_id + tarjeta_id + tipo = 'pago_tarjeta'.
  delete from public.movimientos
   where tarjeta_id = p_tarjeta_id
     and user_id    = v_uid
     and tipo       = 'pago_tarjeta';

  -- Paso e) Borrar la tarjeta. Para cuando corre, ninguna fila de
  -- "movimientos" referencia ya la tarjeta (gastos reasignados en c, pagos
  -- borrados en d; no hay otro tipo que pueda tener tarjeta_id) -> la FK
  -- movimientos_tarjeta_id_fkey (ON DELETE RESTRICT) no se opone.
  delete from public.tarjetas
   where id = p_tarjeta_id
     and user_id = v_uid;

  get diagnostics v_filas = row_count;
  if v_filas <> 1 then
    -- No debería pasar: la Guarda 1 ya confirmó que la tarjeta existía y era
    -- del usuario, y estamos en la misma transacción. Si pasa, algo muy raro
    -- ocurrió -> abortar todo (la transacción se revierte con esta excepción).
    raise exception 'BORRADO_INESPERADO'
      using hint = format('Se esperaba borrar 1 tarjeta, se borraron %s.', v_filas);
  end if;
end;
$$;

comment on function public.eliminar_tarjeta_usuario(uuid, uuid) is
  'Elimina una tarjeta del usuario que llama, en una transaccion: valida que la deuda calculada sea 0; '
  'si la tarjeta tiene gastos, los reasigna a p_cuenta_destino_id (tarjeta_id -> null, cuenta_id -> esa cuenta); '
  'borra los pago_tarjeta de la tarjeta; borra la tarjeta. SECURITY INVOKER: corre con permisos/RLS de auth.uid(). '
  'Ver sql/supabase_borrado_tarjetas_reasignacion.sql.';

-- Sin este grant, ningún usuario autenticado podría ejecutar la función
-- (mismo criterio que "grant execute on function reiniciar_datos_usuario").
grant execute on function public.eliminar_tarjeta_usuario(uuid, uuid) to authenticated;


-- ============================================================================
-- VERIFICACIÓN (correr después de los PASOS 1-3)
-- ============================================================================

-- 1) La FK debe mostrar "ON DELETE RESTRICT" ahora.
-- select conname, pg_get_constraintdef(oid) as definicion
-- from pg_constraint
-- where conrelid = 'public.movimientos'::regclass
--   and conname = 'movimientos_tarjeta_id_fkey';
-- -- esperado: FOREIGN KEY (tarjeta_id) REFERENCES tarjetas(id) ON DELETE RESTRICT

-- 2) La vista debe exponer las 3 columnas nuevas.
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'tarjetas_con_deuda'
--   and column_name in ('cantidad_gastos', 'total_pagado', 'total_gastado')
-- order by column_name;
-- -- esperado: 3 filas

-- 3) NO debe haber ninguna fila hoy con tarjeta_id "huérfano" (apuntando a
--    una tarjeta que no existe) ni ninguna que viole el constraint de forma.
--    Ambas consultas deben devolver 0 filas.
--
-- -- 3a) tarjeta_id huérfano (no debería poder pasar con la FK puesta, pero
-- --     confirma que no quedó basura de la ventana del modelo 2 / cascade):
-- select mv.id, mv.tipo, mv.tarjeta_id
-- from public.movimientos mv
-- left join public.tarjetas t on t.id = mv.tarjeta_id
-- where mv.tarjeta_id is not null and t.id is null;
--
-- -- 3b) filas que violan movimientos_traslado_forma_check:
-- select id, tipo, cuenta_id, cuenta_destino_id, tarjeta_id, categoria_id
-- from public.movimientos
-- where not (
--   (tipo = 'traslado' and cuenta_destino_id is not null and categoria_id is null and tarjeta_id is null)
--   or
--   (tipo = 'pago_tarjeta' and cuenta_id is not null and tarjeta_id is not null and cuenta_destino_id is null and categoria_id is null)
--   or
--   (tipo = 'gasto' and cuenta_destino_id is null and (
--     (cuenta_id is not null and tarjeta_id is null) or (cuenta_id is null and tarjeta_id is not null)
--   ))
--   or
--   (tipo in ('ingreso', 'retiro') and cuenta_destino_id is null and tarjeta_id is null)
-- );

-- 4) PRUEBA FUNCIONAL COMPLETA (con un usuario logueado; reemplazar
--    '<tu-cuenta-id>' por el id de una cuenta tuya real). Prueba el caso
--    principal: tarjeta con 2 gastos, pagada entera desde 1 cuenta, borrada
--    reasignando a esa misma cuenta -> el saldo de la cuenta debe quedar
--    IDÉNTICO al de antes de empezar.
--
-- -- 4a) Anotar el saldo y la cantidad de movimientos de la cuenta ANTES de todo.
-- select id, nombre, saldo, cantidad_movimientos
-- from public.cuentas_con_saldo
-- where id = '<tu-cuenta-id>';
-- -- anotar: saldo = S0, cantidad_movimientos = N0
--
-- -- 4b) Crear una tarjeta de prueba.
-- insert into public.tarjetas (user_id, nombre, color, inicial, cupo_total)
-- values (auth.uid(), 'Tarjeta reasignacion prueba', '#5aa9e6', 'T', 1000000)
-- returning id; -- guardar como '<tarjeta-id>'
--
-- -- 4c) Dos gastos con esa tarjeta (deuda -> 30.000). Fechas distintas a propósito.
-- insert into public.movimientos (user_id, tipo, descripcion, monto, tarjeta_id, categoria_id, fecha)
-- values
--   (auth.uid(), 'gasto', 'Gasto tarjeta prueba 1', 20000, '<tarjeta-id>', null, current_date - 20),
--   (auth.uid(), 'gasto', 'Gasto tarjeta prueba 2', 10000, '<tarjeta-id>', null, current_date - 5);
--
-- -- 4d) Pagar los 30.000 completos desde la cuenta (deuda -> 0, saldo cuenta -30.000).
-- insert into public.movimientos (user_id, tipo, descripcion, monto, cuenta_id, tarjeta_id, fecha)
-- values (auth.uid(), 'pago_tarjeta', 'Pago tarjeta prueba', 30000, '<tu-cuenta-id>', '<tarjeta-id>', current_date);
--
-- -- 4e) Confirmar deuda 0 y las columnas nuevas de la vista.
-- select id, deuda, cantidad_gastos, total_pagado, total_gastado
-- from public.tarjetas_con_deuda
-- where id = '<tarjeta-id>';
-- -- esperado: deuda = 0, cantidad_gastos = 2, total_pagado = 30000, total_gastado = 30000
--
-- -- 4f) Confirmar que el saldo de la cuenta bajó 30.000 respecto a 4a.
-- select id, nombre, saldo, cantidad_movimientos
-- from public.cuentas_con_saldo
-- where id = '<tu-cuenta-id>';
-- -- esperado: saldo = S0 - 30000, cantidad_movimientos = N0 + 1 (el pago)
--
-- -- 4g) CRÍTICO -- borrar la tarjeta reasignando a la misma cuenta.
-- select public.eliminar_tarjeta_usuario('<tarjeta-id>', '<tu-cuenta-id>');
--
-- -- 4h) Los 2 gastos deben seguir existiendo, ahora con cuenta_id y sin
-- --     tarjeta_id, conservando fecha y categoria_id.
-- select id, tipo, descripcion, monto, cuenta_id, tarjeta_id, categoria_id, fecha
-- from public.movimientos
-- where descripcion in ('Gasto tarjeta prueba 1', 'Gasto tarjeta prueba 2')
-- order by fecha;
-- -- esperado: 2 filas, cuenta_id = '<tu-cuenta-id>', tarjeta_id = null, fecha intacta
--
-- -- 4i) El pago NO debe existir más.
-- select id from public.movimientos where descripcion = 'Pago tarjeta prueba';
-- -- esperado: 0 filas
--
-- -- 4j) La tarjeta NO debe existir más.
-- select id from public.tarjetas where id = '<tarjeta-id>';
-- -- esperado: 0 filas
--
-- -- 4k) INVARIANTE -- el saldo de la cuenta debe ser EXACTAMENTE el de 4a (S0):
-- --     -30.000 de los gastos reasignados, +30.000 al borrarse el pago.
-- --     cantidad_movimientos vuelve a N0 + 2 (los 2 gastos) - ... ojo: era
-- --     N0 + 1 (pago) en 4f; ahora son los 2 gastos -> N0 + 2.
-- select id, nombre, saldo, cantidad_movimientos
-- from public.cuentas_con_saldo
-- where id = '<tu-cuenta-id>';
-- -- esperado: saldo = S0 (idéntico a 4a), cantidad_movimientos = N0 + 2
--
-- -- 4l) Limpieza: borrar los 2 gastos de prueba.
-- delete from public.movimientos
-- where descripcion in ('Gasto tarjeta prueba 1', 'Gasto tarjeta prueba 2')
--   and user_id = auth.uid();
--
-- -- 4m) Confirmar que la cuenta volvió EXACTO a 4a.
-- select id, nombre, saldo, cantidad_movimientos
-- from public.cuentas_con_saldo
-- where id = '<tu-cuenta-id>';
-- -- esperado: saldo = S0, cantidad_movimientos = N0

-- 5) (Opcional) Probar los errores de la función -- cada uno debe abortar
--    SIN borrar ni tocar nada:
--
-- -- 5a) Deuda != 0: crear tarjeta + 1 gasto sin pagar, intentar borrar.
-- --     -> debe fallar con 'TARJETA_DEUDA_NO_CERO'.
-- -- 5b) Gastos sin cuenta de reasignación:
-- select public.eliminar_tarjeta_usuario('<tarjeta-con-gastos-saldada>', null);
-- --     -> debe fallar con 'FALTA_CUENTA_DESTINO'.
-- -- 5c) Cuenta de reasignación de otro usuario / inexistente:
-- select public.eliminar_tarjeta_usuario('<tarjeta-id>', gen_random_uuid());
-- --     -> debe fallar con 'CUENTA_DESTINO_INVALIDA'.
-- -- 5d) Tarjeta de otro usuario / inexistente:
-- select public.eliminar_tarjeta_usuario(gen_random_uuid(), null);
-- --     -> debe fallar con 'TARJETA_INVALIDA'.


-- ============================================================================
-- Fin del script.
--
-- Qué NO toca este script (a propósito):
--   - "movimientos_traslado_forma_check" / "movimientos_tipo_check": no hace
--     falta. Un gasto reasignado (cuenta_id, sin tarjeta_id) ya es una forma
--     válida; no aparece ningún tipo nuevo.
--   - "cuentas_con_saldo": un gasto reasignado resta -monto con cuenta_id =
--     la cuenta elegida (rama "when mv.tipo = 'gasto'"), exactamente igual
--     que restaba el pago_tarjeta que reemplaza -> la vista da lo correcto
--     sin cambios.
--   - Las FK "cuenta_id" / "cuenta_destino_id": siguen en CASCADE
--     (supabase_fix_borrado_cuentas.sql), sin relación con este cambio.
--   - La regla "no borrar tarjeta con deuda != 0": este script la mueve a la
--     BASE (paso b de la función); la app la mantiene como primera línea en
--     services/tarjetas.js y GestionTarjetas.jsx (Fase 2-3 del rediseño).
-- ============================================================================
