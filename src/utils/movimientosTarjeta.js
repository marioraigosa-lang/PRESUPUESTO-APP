// Un solo recorrido de los movimientos del mes de una tarjeta puntual (ver
// DetalleTarjeta.jsx), calco de calcularResumenCuenta (movimientosCuenta.js)
// pero más simple: la lista que llega acá ya viene filtrada por tarjeta_id
// (useMovimientosPeriodo con `tarjetaId`), así que solo puede traer dos
// tipos -- 'gasto' (sube la deuda) y 'pago_tarjeta' (la baja) -- sin
// necesidad de una función aparte tipo esEntradaEnCuenta para decidir el
// lado. `neto` es el cambio NETO de deuda en el periodo: positivo si se
// gastó más de lo que se pagó (la deuda creció), negativo o cero si se pagó
// igual o más de lo que se gastó.
export function calcularResumenTarjeta(movimientos) {
  const { totalGastado, totalPagado } = movimientos.reduce(
    (acumulado, movimiento) => {
      if (movimiento.tipo === 'gasto') {
        acumulado.totalGastado += movimiento.monto
      } else if (movimiento.tipo === 'pago_tarjeta') {
        acumulado.totalPagado += movimiento.monto
      }
      return acumulado
    },
    { totalGastado: 0, totalPagado: 0 },
  )

  return { totalGastado, totalPagado, neto: totalGastado - totalPagado }
}
