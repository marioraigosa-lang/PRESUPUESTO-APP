import { parsearFechaISO } from './formatoFecha'

// Valores de respaldo para un gasto sin categoría (o cuya categoría fue
// eliminada): mismos que usaba Resumen.jsx antes de esta extracción.
const EMOJI_SIN_CATEGORIA = '✨'
const COLOR_SIN_CATEGORIA = '#9db0a6'
const MESES_POR_ANIO = 12

function sumarMontos(movimientos) {
  return movimientos.reduce((suma, movimiento) => suma + movimiento.monto, 0)
}

// Totales del periodo para las tarjetas de Resumen: ingresos, gastos
// (separados en fijos/variables según si la categoría del movimiento es "de
// sistema" -- las que crea la sección de Gastos Fijos) y el balance
// resultante. Recibe TODOS los movimientos del periodo (ingresos y gastos
// mezclados, tal como vienen de Supabase) y filtra internamente por tipo.
export function calcularTotalesResumen(movimientos) {
  const totalIngresos = sumarMontos(movimientos.filter((movimiento) => movimiento.tipo === 'ingreso'))

  const movimientosGasto = movimientos.filter((movimiento) => movimiento.tipo === 'gasto')
  const totalGastosFijos = sumarMontos(
    movimientosGasto.filter((movimiento) => movimiento.categoria?.es_sistema),
  )
  const totalGastosVariables = sumarMontos(
    movimientosGasto.filter((movimiento) => !movimiento.categoria?.es_sistema),
  )
  const totalGastos = totalGastosFijos + totalGastosVariables

  return {
    totalIngresos,
    totalGastosFijos,
    totalGastosVariables,
    totalGastos,
    balance: totalIngresos - totalGastos,
  }
}

// Agrupa los GASTOS del periodo por categoría, con el porcentaje que
// representa cada una sobre `totalGastos`. `totalGastos` se recibe ya
// calculado (en vez de recalcularlo acá) para que el porcentaje siempre
// coincida con el que muestra la tarjeta de totales, sin importar cómo se
// haya obtenido. Los movimientos sin categoría (o con una categoría
// eliminada) se agrupan bajo un ítem "sin-categoría", usando
// `textoSinCategoria` como nombre -- viaja como parámetro porque este util
// no es un componente y no tiene acceso a t(). El resultado queda ordenado
// de mayor a menor gasto.
export function agruparGastosPorCategoria(movimientos, totalGastos, textoSinCategoria) {
  const mapaCategorias = new Map()

  movimientos
    .filter((movimiento) => movimiento.tipo === 'gasto')
    .forEach((movimiento) => {
      const categoria = movimiento.categoria
      const id = categoria?.id ?? 'sin-categoria'
      const actual = mapaCategorias.get(id) ?? {
        id,
        nombre: categoria?.nombre ?? textoSinCategoria,
        emoji: categoria?.emoji ?? EMOJI_SIN_CATEGORIA,
        color: categoria?.color ?? COLOR_SIN_CATEGORIA,
        monto: 0,
      }
      actual.monto += movimiento.monto
      mapaCategorias.set(id, actual)
    })

  return [...mapaCategorias.values()]
    .sort((a, b) => b.monto - a.monto)
    .map((item) => ({
      ...item,
      porcentaje: totalGastos === 0 ? 0 : Math.round((item.monto / totalGastos) * 100),
    }))
}

// Ingresos y gastos de CADA uno de los 12 meses del año (para el gráfico de
// barras mensual de Resumen). Siempre devuelve los 12 meses, incluso los que
// no tienen movimientos, para que el gráfico tenga el mismo ancho sin
// importar cuántos meses tuvieron actividad.
export function agruparPorMes(movimientos) {
  return Array.from({ length: MESES_POR_ANIO }, (_, mes) => {
    const movimientosDelMes = movimientos.filter(
      (movimiento) => parsearFechaISO(movimiento.fecha).getMonth() === mes,
    )
    return {
      mes,
      ingresos: sumarMontos(movimientosDelMes.filter((movimiento) => movimiento.tipo === 'ingreso')),
      gastos: sumarMontos(movimientosDelMes.filter((movimiento) => movimiento.tipo === 'gasto')),
    }
  })
}
