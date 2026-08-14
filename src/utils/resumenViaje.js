// Funciones puras para el dashboard de presupuesto vs. ejecutado de "Planifica
// tus viajes" (Fase 4). Sin llamadas a Supabase ni estado de React, para que
// sean fáciles de probar: reciben la categoría y la lista completa de gastos
// del viaje, y devuelven números listos para pintar.

// El presupuesto de una categoría está en UNA sola moneda (categoria.moneda).
// Solo los gastos de esa categoría que están EN ESA MISMA MONEDA se suman al
// "ejecutado" y al porcentaje -- no hay conversión entre monedas en esta app.
// Los gastos de la categoría en OTRA moneda se devuelven aparte, agrupados
// por moneda, para mostrarlos como información sin mezclarlos en el cálculo.
export function resumenCategoriaViaje(categoria, gastos) {
  const gastosDeCategoria = gastos.filter((gasto) => gasto.categoria_viaje_id === categoria.id)

  const ejecutado = gastosDeCategoria
    .filter((gasto) => gasto.moneda === categoria.moneda)
    .reduce((total, gasto) => total + Number(gasto.monto), 0)

  const otrasMonedas = totalesPorMoneda(gastosDeCategoria.filter((gasto) => gasto.moneda !== categoria.moneda))

  const presupuesto = Number(categoria.presupuesto) || 0
  // Presupuesto 0 (o sin definir) no tiene un "% ejecutado" con sentido --
  // se devuelve null para que quien pinte la barra sepa que debe mostrar
  // "sin presupuesto definido" en vez de dividir por cero.
  const porcentaje = presupuesto > 0 ? (ejecutado / presupuesto) * 100 : null

  return { ejecutado, porcentaje, otrasMonedas }
}

// Clasifica el porcentaje de ejecución en un color de alerta, coherente con
// el tema de la app: verde mientras hay margen, ámbar cerca del límite, rojo
// en sobregasto. `null` (sin presupuesto) no tiene color -- quien lo use
// debe manejar ese caso aparte (ver resumenCategoriaViaje).
export function colorBarraPresupuesto(porcentaje) {
  if (porcentaje === null) return null
  if (porcentaje > 100) return 'coral'
  if (porcentaje >= 75) return 'gold'
  return 'mint'
}

// Los gastos de una categoría borrada quedan con categoria_viaje_id = null
// (ver "on delete set null" en supabase_gastos_viaje.sql): nunca deberían
// desaparecer del viaje solo porque su categoría ya no existe.
export function gastosSinCategoria(gastos) {
  return gastos.filter((gasto) => !gasto.categoria_viaje_id)
}

// Agrupa una lista de gastos por moneda, sumando sus montos -- útil tanto
// para "otras monedas" dentro de una categoría como para el total de gastos
// sin categoría.
export function totalesPorMoneda(gastos) {
  return gastos.reduce((totales, gasto) => {
    totales[gasto.moneda] = (totales[gasto.moneda] ?? 0) + Number(gasto.monto)
    return totales
  }, {})
}
