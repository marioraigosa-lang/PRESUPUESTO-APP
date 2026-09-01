// Totales del checklist de Gastos Fijos para el mes seleccionado. Recibe la
// lista ya combinada con el estado "pagado" recalculado para ese mes (ver
// `gastosConEstado` en GastosFijos.jsx) y resume cuánto se debe en total,
// cuánto ya se pagó, cuánto falta y qué porcentaje representa lo pagado
// (con guarda contra división por cero cuando no hay ningún gasto fijo).
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
