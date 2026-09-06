// A partir de los movimientos de una tarjeta, calcula desde qué cuentas se
// pagó esa tarjeta y cuánto desde cada una. Se usa al ELIMINAR una tarjeta
// (Fase 3 del rediseño del borrado con reasignación, ver
// sql/supabase_borrado_tarjetas_reasignacion.sql): si la tarjeta tiene
// gastos, hay que reasignarlos a una cuenta, y este cálculo decide
//   - si mostrar el selector de cuenta (hay varios pagadores distintos), y
//   - cuál pre-seleccionar por defecto (la que más pagó).
//
// Recibe la lista de movimientos de la tarjeta tal como llega de
// useMovimientosPeriodo (gastos + pagos mezclados); filtra internamente los
// 'pago_tarjeta' con cuenta_id. Un movimiento sin cuenta_id (no debería
// pasar en un pago) simplemente se ignora.
//
// Devuelve:
//   - cuentas: [{ cuentaId, total }] ordenado de mayor a menor total pagado.
//   - hayVariosPagadores: true si hay 2 o más cuentas distintas.
//   - cuentaSugerida: la cuentaId que más pagó (o null si no hubo pagos). En
//     caso de empate, gana la primera que aparece en `movimientos` (el
//     .sort() de abajo es estable en los motores modernos).
export function calcularPagosPorCuenta(movimientos = []) {
  const totalPorCuenta = new Map()

  for (const movimiento of movimientos) {
    if (movimiento?.tipo !== 'pago_tarjeta') continue
    const cuentaId = movimiento.cuenta_id
    if (!cuentaId) continue
    totalPorCuenta.set(cuentaId, (totalPorCuenta.get(cuentaId) ?? 0) + (movimiento.monto ?? 0))
  }

  const cuentas = [...totalPorCuenta.entries()]
    .map(([cuentaId, total]) => ({ cuentaId, total }))
    .sort((a, b) => b.total - a.total)

  return {
    cuentas,
    hayVariosPagadores: cuentas.length > 1,
    cuentaSugerida: cuentas[0]?.cuentaId ?? null,
  }
}
