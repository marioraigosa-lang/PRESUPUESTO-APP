// ¿Este movimiento representa dinero que ENTRA a `cuentaId`? Un ingreso
// siempre entra; un gasto siempre sale; un retiro también siempre sale (es
// plata que sale del sistema, no va a ninguna otra cuenta); un traslado
// depende de qué lado de la cuenta se está mirando -- entra si esta cuenta
// es el destino, sale si es el origen (ver decisión de diseño: los
// traslados cuentan como ingreso/egreso "normal" desde la perspectiva de
// cada cuenta).
export function esEntradaEnCuenta(movimiento, cuentaId) {
  if (movimiento.tipo === 'ingreso') return true
  if (movimiento.tipo === 'gasto' || movimiento.tipo === 'retiro') return false
  return movimiento.cuenta_destino_id === cuentaId
}

// Un solo recorrido de los movimientos del mes: acumula los 3 totales (que
// consideran TODOS los movimientos, incluidos los traslados en ambas
// direcciones) y a la vez arma la lista de abajo, que excluye únicamente
// los gastos normales (con categoría) -- ingresos, retiros y traslados (de
// entrada Y de salida) sí se listan, con su texto/color direccional ya
// resuelto por <Movimiento cuentaContextoId=... />.
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

// Texto del movimiento tal como debe verse desde la perspectiva de
// `cuentaContextoId` (pantallas de detalle de una cuenta puntual, ver
// DetalleCuenta.jsx). Solo los traslados cambian: el resto de tipos
// siempre se ven igual, se esté mirando "desde afuera" (Home) o "desde
// adentro" de una cuenta. Se exporta aparte de <Movimiento> para que la
// pantalla que lo usa pueda armar el mismo texto en su diálogo de
// confirmación de borrado, sin duplicar la lógica de "¿es origen o
// destino?".
export function descripcionEnContexto(movimiento, cuentaContextoId, t) {
  if (movimiento.tipo !== 'traslado' || !cuentaContextoId) return movimiento.descripcion

  const esOrigen = movimiento.cuenta_id === cuentaContextoId
  return esOrigen
    ? t('cuentas.detalle.trasladoA', { cuenta: movimiento.cuentaDestino ?? t('home.cuentaEliminada') })
    : t('cuentas.detalle.trasladoDesde', { cuenta: movimiento.cuenta ?? t('home.cuentaEliminada') })
}
