-- ============================================================================
-- supabase_reiniciar_datos.sql
--
-- FASE 6 del plan "saldo calculado": función "Reiniciar datos" -- el
-- usuario borra sus movimientos (y, opcionalmente, sus gastos fijos
-- definidos) desde la app para empezar limpio, sin tener que borrar la
-- cuenta entera (eso ya existe: ver la Edge Function "eliminar-cuenta").
--
-- Por qué esto es seguro ahora y no lo era antes de la Fase 1: como el
-- saldo de cada cuenta es CALCULADO (saldo_inicial + efecto neto de sus
-- movimientos, vista "cuentas_con_saldo" -- ver supabase_saldo_calculado.sql)
-- y nunca se guarda, borrar movimientos no requiere ningún UPDATE manual
-- sobre "cuentas.saldo" para "cuadrar" nada: el saldo vuelve solo a
-- saldo_inicial en la próxima lectura de la vista. "cuentas.saldo_inicial"
-- y las filas de "cuentas"/"categorias" NUNCA se tocan aquí.
--
-- Qué hace la función (todo en una transacción -- automático en una
-- función plpgsql: si cualquier paso falla, TODO se revierte):
--   1. Borra todos los movimientos del usuario que llama.
--   2. Si borrar_gastos_fijos = true: borra también las definiciones de
--      gastos fijos del usuario (nombre, monto, día de pago).
--      Si borrar_gastos_fijos = false (default): los gastos fijos se
--      CONSERVAN, pero se desmarcan (pagado = false) -- el movimiento que
--      respaldaba ese pago ya no existe (se borró en el paso 1), así que
--      dejar pagado = true sería mentir sobre el estado real.
--
-- SECURITY INVOKER (no SECURITY DEFINER): a propósito. La función corre con
-- los permisos y las políticas RLS de QUIEN LA LLAMA (auth.uid() es el uid
-- de esa sesión), exactamente igual que si el cliente hiciera los DELETE/
-- UPDATE directo contra las tablas -- ver supabase_etapa3_rls.sql, que ya
-- exige auth.uid() = user_id para borrar/actualizar movimientos y
-- gastos_fijos. Con SECURITY DEFINER (permisos elevados del dueño de la
-- función) este "where user_id = auth.uid()" sería la ÚNICA barrera real,
-- y cualquier descuido la volvería explotable; con SECURITY INVOKER, RLS
-- sigue siendo la barrera de fondo aunque el "where" de acá tuviera un bug.
--
-- Seguro de ejecutar más de una vez: "create or replace function" y
-- "grant execute" no son destructivos por sí mismos. Los DELETE/UPDATE dentro
-- SÍ son destructivos por diseño (esa es la función de la función) -- por
-- eso este archivo se entrega para revisión manual, no para correrse solo.
-- ============================================================================

create or replace function public.reiniciar_datos_usuario(borrar_gastos_fijos boolean default false)
returns void
language plpgsql
security invoker
as $$
begin
  -- Paso 1: borra todos los movimientos del usuario que llama. RLS
  -- (eliminar_propio_movimientos, supabase_etapa3_rls.sql) ya exige
  -- auth.uid() = user_id -- este "where" es la misma condición explícita
  -- del lado de la función, no un reemplazo de esa política.
  delete from public.movimientos
  where user_id = auth.uid();

  if borrar_gastos_fijos then
    -- Reinicio total: también se borran las definiciones de gastos fijos.
    -- No hace falta desmarcar "pagado" aparte -- la fila entera desaparece.
    delete from public.gastos_fijos
    where user_id = auth.uid();
  else
    -- Reinicio solo de movimientos: los gastos fijos definidos se
    -- conservan, pero se desmarcan porque el movimiento que respaldaba
    -- cada pago ya no existe (se borró en el paso 1).
    update public.gastos_fijos
    set pagado = false
    where user_id = auth.uid();
  end if;
end;
$$;

comment on function public.reiniciar_datos_usuario(boolean) is
  'Borra los movimientos del usuario que llama (y, si borrar_gastos_fijos, también sus gastos fijos definidos). '
  'SECURITY INVOKER: corre con los permisos/RLS de auth.uid(), nunca con permisos elevados. '
  'No toca cuentas ni categorias -- los saldos vuelven solos a saldo_inicial via la vista cuentas_con_saldo.';

-- Sin este grant, ningún usuario autenticado podría ejecutar la función
-- (mismo criterio que el "grant select on cuentas_con_saldo" de la Fase 1).
grant execute on function public.reiniciar_datos_usuario(boolean) to authenticated;


-- ============================================================================
-- Fin del script.
--
-- Qué NO hace esta función (a propósito):
--   - No borra ni modifica "cuentas" (ni saldo, ni saldo_inicial) --
--     el saldo calculado vuelve solo a saldo_inicial al no quedar
--     movimientos que le sumen efecto.
--   - No borra "categorias".
--   - No toca viajes, gastos_viaje, categorias_viaje, fondo_emergencia ni
--     metas_ahorro -- fuera del alcance de esta pantalla (son datos
--     independientes de "movimientos"/"gastos_fijos").
-- ============================================================================
