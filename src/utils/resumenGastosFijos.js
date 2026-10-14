// Combina las plantillas de gastos fijos con los movimientos vinculados de
// UN mes (`movimientosMes` es un mapa gasto_fijo_id -> movimiento de ese
// mes). La fuente de verdad del mes es el movimiento:
//   - `pagado`: hay movimiento vinculado ese mes.
//   - `monto`: si está pagado, lo que REALMENTE se pagó (el monto del
//     movimiento), no el monto actual de la plantilla -- así, cambiar el
//     presupuesto del gasto fijo no reescribe los meses ya pagados. Si está
//     pendiente, el de la plantilla (lo que se espera pagar). El
//     placeholder optimista de GastosFijos.jsx no trae monto, así que
//     mientras se confirma se usa el de la plantilla (que es justo el que
//     se va a guardar).
//   - `pagadoConTarjeta`: nombre de la tarjeta si el pago de ese mes fue
//     con tarjeta, o null -- solo alimenta el indicador visual 💳.
export function combinarGastosConMes(gastos, movimientosMes) {
  return gastos.map((gasto) => {
    const movimiento = movimientosMes[gasto.id]
    return {
      ...gasto,
      monto: movimiento?.monto != null ? Number(movimiento.monto) : gasto.monto,
      pagado: Boolean(movimiento),
      pagadoConTarjeta: movimiento?.tarjeta?.nombre ?? null,
    }
  })
}

// Totales del checklist de Gastos Fijos para el mes seleccionado. Recibe la
// lista ya combinada con el estado "pagado" recalculado para ese mes (ver
// `gastosConEstado` en GastosFijos.jsx) y resume cuánto se debe en total,
// cuánto ya se pagó, cuánto falta y qué porcentaje representa lo pagado
// (con guarda contra división por cero cuando no hay ningún gasto fijo).
//
// El `monto` de cada gasto ya viene resuelto para ese mes por
// combinarGastosConMes: el del movimiento real si está pagado, el de la
// plantilla si está pendiente. Por eso
// `totalPagado` suma lo que de verdad se pagó y `totalPendiente` lo que se
// espera pagar según el presupuesto actual.
export function calcularResumenGastosFijos(gastosConEstado) {
  const total = gastosConEstado.reduce((suma, gasto) => suma + gasto.monto, 0)
  const totalPagado = gastosConEstado
    .filter((gasto) => gasto.pagado)
    .reduce((suma, gasto) => suma + gasto.monto, 0)
  const totalPendiente = total - totalPagado
  const porcentaje = total === 0 ? 0 : Math.round((totalPagado / total) * 100)
  const pagadosCantidad = gastosConEstado.filter((gasto) => gasto.pagado).length
  const cantidadTotal = gastosConEstado.length

  return { total, totalPagado, totalPendiente, porcentaje, pagadosCantidad, cantidadTotal }
}
