// ¿Este movimiento representa dinero que ENTRA a `cuentaId`? Un ingreso
// siempre entra; un gasto siempre sale; un traslado depende de qué lado de
// la cuenta se está mirando -- entra si esta cuenta es el destino, sale si
// es el origen (ver decisión de diseño: los traslados cuentan como
// ingreso/egreso "normal" desde la perspectiva de cada cuenta).
export function esEntradaEnCuenta(movimiento, cuentaId) {
  if (movimiento.tipo === 'ingreso') return true
  if (movimiento.tipo === 'gasto') return false
  return movimiento.cuenta_destino_id === cuentaId
}

// Un solo recorrido de los movimientos del mes: acumula los 3 totales (que
// consideran TODOS los movimientos, incluidos los traslados en ambas
// direcciones) y a la vez arma la lista de abajo, que excluye únicamente
// los gastos normales (con categoría) -- ingresos y traslados (de entrada
// Y de salida) sí se listan, con su texto/color direccional ya resuelto
// por <Movimiento cuentaContextoId=... />.
export function calcularResumenCuenta(movimientos, cuentaId) {
  const { totalIngresos, totalEgresos, listaMovimientos } = movimientos.reduce(
    (acumulado, movimiento) => {
      if (esEntradaEnCuenta(movimiento, cuentaId)) {
        acumulado.totalIngresos += movimiento.monto
      } else {
        acumulado.totalEgresos += movimiento.monto
      }
      if (movimiento.tipo !== 'gasto') {
        acumulado.listaMovimientos.push(movimiento)
      }
      return acumulado
    },
    { totalIngresos: 0, totalEgresos: 0, listaMovimientos: [] },
  )

  return { totalIngresos, totalEgresos, neto: totalIngresos - totalEgresos, listaMovimientos }
}
