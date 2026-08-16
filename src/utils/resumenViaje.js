import { MONEDAS } from './monedas'

// Funciones puras para el dashboard de presupuesto vs. ejecutado (Fase 4) y
// el resumen bajo demanda (Fase 5) de "Planifica tus viajes". Sin llamadas a
// Supabase ni estado de React, para que sean fáciles de probar: reciben la
// categoría (o lista de categorías) y la lista completa de gastos del viaje,
// y devuelven números listos para pintar.

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

// Agrupa los gastos de UNA moneda por categoría, sumando sus montos. Los
// gastos sin categoría (categoria_viaje_id null, ver gastosSinCategoria) se
// agrupan bajo `categoria: null` para que quien pinte la lista muestre "Sin
// categoría" en vez de perderlos. Se ordena de mayor a menor gasto, para que
// el resumen resalte primero en qué se fue más plata.
function agruparPorCategoria(gastosDeMoneda, categorias) {
  const totalesPorCategoriaId = gastosDeMoneda.reduce((totales, gasto) => {
    const clave = gasto.categoria_viaje_id ?? 'sin-categoria'
    totales[clave] = (totales[clave] ?? 0) + Number(gasto.monto)
    return totales
  }, {})

  return Object.entries(totalesPorCategoriaId)
    .map(([clave, total]) => ({
      categoria: clave === 'sin-categoria' ? null : (categorias.find((c) => c.id === clave) ?? null),
      total,
    }))
    .sort((a, b) => b.total - a.total)
}

// Resumen bajo demanda de un viaje (Fase 5): separa TODOS los gastos del
// viaje por moneda (nunca se mezclan ni se convierten) y, dentro de cada
// moneda, por categoría. El orden de las monedas sigue el orden fijo de
// MONEDAS (COP, USD, EUR) en vez del orden de inserción de los gastos, para
// que el resumen se vea igual sin importar en qué orden se registraron.
export function resumenPorMonedaYCategoria(gastos, categorias) {
  const totales = totalesPorMoneda(gastos)

  return Object.keys(MONEDAS)
    .filter((moneda) => totales[moneda] !== undefined)
    .map((moneda) => {
      const gastosDeMoneda = gastos.filter((gasto) => gasto.moneda === moneda)
      return {
        moneda,
        total: totales[moneda],
        categorias: agruparPorCategoria(gastosDeMoneda, categorias),
      }
    })
}
