import { parsearFechaISO } from './formatoFecha'
import { resolverIconoCategoria } from './resolverIconoCategoria'

// Valores de respaldo para un gasto sin categoría (o cuya categoría fue
// eliminada): mismos que usaba Resumen.jsx antes de esta extracción.
// ICONO_SIN_CATEGORIA = 'sparkles' (decisión del PLAN-iconos.md): un ítem
// "sin categoría" no es lo mismo que un icono sin mapeo -- ese caso usa el
// fallback general 'tag' (ver resolverIconoCategoria / catalogoIconos.js).
const ICONO_SIN_CATEGORIA = 'sparkles'
const COLOR_SIN_CATEGORIA = '#9db0a6'
const MESES_POR_ANIO = 12

// Bucket propio para los retiros dentro del desglose por categoría: un
// retiro NUNCA tiene categoría (es efectivo genérico, ver flujos.js), pero
// mezclarlo bajo el mismo ítem "sin-categoria" que un gasto con categoría
// eliminada confundiría dos cosas distintas (una es un descuido de datos,
// la otra es una decisión de diseño). 'banknote' + coral porque así ya se
// ve un retiro en el resto de la app (icono del tipo de movimiento, mismo
// tinte que "egreso" -- ver Movimiento.jsx / resolverIconoMovimiento).
const ID_RETIROS = 'retiros'
const ICONO_RETIROS = 'banknote'
const COLOR_RETIROS = '#f2795b'

function sumarMontos(movimientos) {
  return movimientos.reduce((suma, movimiento) => suma + movimiento.monto, 0)
}

// Totales del periodo para las tarjetas de Resumen: ingresos, gastos
// (separados en fijos/variables según si la categoría del movimiento es "de
// sistema" -- las que crea la sección de Gastos Fijos -- más `totalRetiros`
// aparte) y el balance resultante. Recibe TODOS los movimientos del periodo
// (ingresos y gastos mezclados, tal como vienen de Supabase) y filtra
// internamente por tipo.
//
// Un 'retiro' SÍ cuenta como gasto del mes (es plata que sale del sistema y
// se consume, mismo criterio que ya usa gastoMensualPromedio.js para el
// fondo de emergencia -- antes de este cambio el retiro no aparecía en
// ningún total de "gastos" de la app, lo cual subestimaba el gasto real del
// mes). Se sigue sumando aparte de fijos/variables (en vez de mezclarlo
// dentro de "variables") porque un retiro no tiene categoría -- meterlo en
// "Variables" haría que ese número dejara de coincidir con el total que
// muestra la propia pantalla de Gastos Variables (que sí sigue siendo
// puramente por categoría, ver GastosVariables.jsx). `totalGastos` sigue
// siendo la suma de las tres partes, así que el desglose que se muestre
// (fijos + variables + retiros) siempre cuadra con el total.
export function calcularTotalesResumen(movimientos) {
  const totalIngresos = sumarMontos(movimientos.filter((movimiento) => movimiento.tipo === 'ingreso'))

  const movimientosGasto = movimientos.filter((movimiento) => movimiento.tipo === 'gasto')
  const totalGastosFijos = sumarMontos(
    movimientosGasto.filter((movimiento) => movimiento.categoria?.es_sistema),
  )
  const totalGastosVariables = sumarMontos(
    movimientosGasto.filter((movimiento) => !movimiento.categoria?.es_sistema),
  )
  const totalRetiros = sumarMontos(movimientos.filter((movimiento) => movimiento.tipo === 'retiro'))
  const totalGastos = totalGastosFijos + totalGastosVariables + totalRetiros

  return {
    totalIngresos,
    totalGastosFijos,
    totalGastosVariables,
    totalRetiros,
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
// no es un componente y no tiene acceso a t(). Los RETIROS (tampoco tienen
// categoría, pero por diseño -- no por un dato faltante) se agrupan aparte,
// bajo un ítem propio "Retiros/Efectivo" (`textoRetiros`), para no
// mezclarlos con los gastos "sin-categoría" de verdad. El resultado queda
// ordenado de mayor a menor gasto.
export function agruparGastosPorCategoria(movimientos, totalGastos, textoSinCategoria, textoRetiros) {
  const mapaCategorias = new Map()

  movimientos
    .filter((movimiento) => movimiento.tipo === 'gasto')
    .forEach((movimiento) => {
      const categoria = movimiento.categoria
      const id = categoria?.id ?? 'sin-categoria'
      const actual = mapaCategorias.get(id) ?? {
        id,
        nombre: categoria?.nombre ?? textoSinCategoria,
        icono: categoria ? resolverIconoCategoria(categoria) : ICONO_SIN_CATEGORIA,
        color: categoria?.color ?? COLOR_SIN_CATEGORIA,
        monto: 0,
      }
      actual.monto += movimiento.monto
      mapaCategorias.set(id, actual)
    })

  const totalRetiros = sumarMontos(movimientos.filter((movimiento) => movimiento.tipo === 'retiro'))
  if (totalRetiros > 0) {
    mapaCategorias.set(ID_RETIROS, {
      id: ID_RETIROS,
      nombre: textoRetiros,
      icono: ICONO_RETIROS,
      color: COLOR_RETIROS,
      monto: totalRetiros,
    })
  }

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
// importar cuántos meses tuvieron actividad. Los retiros suman al "gasto"
// del mes, igual que en calcularTotalesResumen.
export function agruparPorMes(movimientos) {
  return Array.from({ length: MESES_POR_ANIO }, (_, mes) => {
    const movimientosDelMes = movimientos.filter(
      (movimiento) => parsearFechaISO(movimiento.fecha).getMonth() === mes,
    )
    return {
      mes,
      ingresos: sumarMontos(movimientosDelMes.filter((movimiento) => movimiento.tipo === 'ingreso')),
      gastos: sumarMontos(
        movimientosDelMes.filter((movimiento) => movimiento.tipo === 'gasto' || movimiento.tipo === 'retiro'),
      ),
    }
  })
}
