import { describe, expect, it } from 'vitest'
import { calcularTotalesResumen, agruparGastosPorCategoria, agruparPorMes } from './resumenCalculos'

// Categoría "de sistema": la que crea la sección de Gastos Fijos (ej.
// "Arriendo"). Los movimientos con esta categoría cuentan como "gasto fijo"
// en vez de "gasto variable".
const CATEGORIA_FIJA = { id: 'cat-arriendo', nombre: 'Arriendo', emoji: '🏠', color: '#111111', es_sistema: true }
const CATEGORIA_VARIABLE = { id: 'cat-comida', nombre: 'Comida', emoji: '🍔', color: '#222222', es_sistema: false }
const CATEGORIA_VARIABLE_2 = { id: 'cat-ocio', nombre: 'Ocio', emoji: '🎬', color: '#333333', es_sistema: false }
// icono ya asignado (post-backfill B3): resolverIconoCategoria debe preferirlo
// sobre derivar del emoji.
const CATEGORIA_CON_ICONO = {
  id: 'cat-salud',
  nombre: 'Salud',
  emoji: '💊',
  icono: 'heart-pulse',
  color: '#444444',
  es_sistema: false,
}

describe('calcularTotalesResumen', () => {
  it('suma ingresos, separa gastos fijos de variables y calcula un balance positivo', () => {
    const movimientos = [
      { tipo: 'ingreso', monto: 3000000 },
      { tipo: 'gasto', monto: 800000, categoria: CATEGORIA_FIJA },
      { tipo: 'gasto', monto: 200000, categoria: CATEGORIA_VARIABLE },
      { tipo: 'gasto', monto: 100000, categoria: CATEGORIA_VARIABLE_2 },
    ]

    const resultado = calcularTotalesResumen(movimientos)

    expect(resultado.totalIngresos).toBe(3000000)
    expect(resultado.totalGastosFijos).toBe(800000)
    expect(resultado.totalGastosVariables).toBe(300000) // 200.000 + 100.000
    expect(resultado.totalRetiros).toBe(0)
    expect(resultado.totalGastos).toBe(1100000) // fijos + variables
    expect(resultado.balance).toBe(1900000) // 3.000.000 - 1.100.000
  })

  it('calcula un balance negativo cuando los gastos superan los ingresos', () => {
    const movimientos = [
      { tipo: 'ingreso', monto: 500000 },
      { tipo: 'gasto', monto: 700000, categoria: CATEGORIA_VARIABLE },
    ]

    const resultado = calcularTotalesResumen(movimientos)

    expect(resultado.balance).toBe(-200000)
  })

  it('trata un movimiento de gasto sin categoría (o con categoría eliminada) como gasto variable', () => {
    // categoria === null/undefined -> categoria?.es_sistema es undefined,
    // que es "falsy", así que cae en variables (igual que antes de extraer
    // este cálculo del componente).
    const movimientos = [{ tipo: 'gasto', monto: 50000, categoria: null }]

    const resultado = calcularTotalesResumen(movimientos)

    expect(resultado.totalGastosFijos).toBe(0)
    expect(resultado.totalGastosVariables).toBe(50000)
  })

  it('ignora los traslados: no son ni ingreso ni gasto', () => {
    const movimientos = [
      { tipo: 'ingreso', monto: 100000 },
      { tipo: 'traslado', monto: 999999, categoria: null },
    ]

    const resultado = calcularTotalesResumen(movimientos)

    expect(resultado.totalIngresos).toBe(100000)
    expect(resultado.totalGastos).toBe(0)
  })

  it('caso vacío: sin movimientos, todos los totales quedan en 0 y el balance en 0', () => {
    const resultado = calcularTotalesResumen([])

    expect(resultado).toEqual({
      totalIngresos: 0,
      totalGastosFijos: 0,
      totalGastosVariables: 0,
      totalRetiros: 0,
      totalGastos: 0,
      balance: 0,
    })
  })

  it('cuenta los retiros como gasto del mes, aparte de fijos/variables (no tienen categoría)', () => {
    const movimientos = [
      { tipo: 'ingreso', monto: 100000 },
      { tipo: 'retiro', monto: 30000, categoria: null },
    ]

    const resultado = calcularTotalesResumen(movimientos)

    expect(resultado.totalIngresos).toBe(100000)
    expect(resultado.totalGastosFijos).toBe(0)
    expect(resultado.totalGastosVariables).toBe(0)
    expect(resultado.totalRetiros).toBe(30000)
    expect(resultado.totalGastos).toBe(30000)
    expect(resultado.balance).toBe(70000)
  })

  it('suma retiros y gastos categorizados en el mismo totalGastos, sin doble conteo', () => {
    const movimientos = [
      { tipo: 'gasto', monto: 200000, categoria: CATEGORIA_VARIABLE },
      { tipo: 'retiro', monto: 50000, categoria: null },
    ]

    const resultado = calcularTotalesResumen(movimientos)

    expect(resultado.totalGastosVariables).toBe(200000)
    expect(resultado.totalRetiros).toBe(50000)
    expect(resultado.totalGastos).toBe(250000)
  })
})

describe('agruparGastosPorCategoria', () => {
  it('agrupa varios movimientos de la misma categoría y suma sus montos', () => {
    const movimientos = [
      { tipo: 'gasto', monto: 30000, categoria: CATEGORIA_VARIABLE },
      { tipo: 'gasto', monto: 20000, categoria: CATEGORIA_VARIABLE },
    ]

    const resultado = agruparGastosPorCategoria(movimientos, 50000, 'Sin categoría')

    expect(resultado).toEqual([
      {
        id: 'cat-comida',
        nombre: 'Comida',
        icono: 'utensils', // derivado de '🍔' (sin "icono" propio todavía)
        color: '#222222',
        monto: 50000,
        porcentaje: 100,
      },
    ])
  })

  it('incluye una categoría de sistema (gasto fijo) como una categoría más del desglose', () => {
    const movimientos = [{ tipo: 'gasto', monto: 800000, categoria: CATEGORIA_FIJA }]

    const resultado = agruparGastosPorCategoria(movimientos, 800000, 'Sin categoría')

    expect(resultado).toEqual([
      {
        id: 'cat-arriendo',
        nombre: 'Arriendo',
        icono: 'house', // derivado de '🏠'
        color: '#111111',
        monto: 800000,
        porcentaje: 100,
      },
    ])
  })

  it('si la categoría ya tiene "icono" propio (post-backfill), lo usa en vez de derivar del emoji', () => {
    const movimientos = [{ tipo: 'gasto', monto: 40000, categoria: CATEGORIA_CON_ICONO }]

    const resultado = agruparGastosPorCategoria(movimientos, 40000, 'Sin categoría')

    expect(resultado[0].icono).toBe('heart-pulse')
  })

  it('agrupa los gastos sin categoría bajo un ítem "sin-categoria" con nombre/icono/color de respaldo', () => {
    const movimientos = [
      { tipo: 'gasto', monto: 10000, categoria: null },
      { tipo: 'gasto', monto: 5000, categoria: undefined },
    ]

    const resultado = agruparGastosPorCategoria(movimientos, 15000, 'Sin categoría')

    expect(resultado).toEqual([
      {
        id: 'sin-categoria',
        nombre: 'Sin categoría',
        icono: 'sparkles',
        color: '#9db0a6',
        monto: 15000,
        porcentaje: 100,
      },
    ])
  })

  it('ordena de mayor a menor gasto y calcula el porcentaje de cada categoría sobre el total', () => {
    const movimientos = [
      { tipo: 'gasto', monto: 20000, categoria: CATEGORIA_VARIABLE }, // 20%
      { tipo: 'gasto', monto: 80000, categoria: CATEGORIA_VARIABLE_2 }, // 80%
    ]

    const resultado = agruparGastosPorCategoria(movimientos, 100000, 'Sin categoría')

    expect(resultado.map((item) => item.id)).toEqual(['cat-ocio', 'cat-comida'])
    expect(resultado[0].porcentaje).toBe(80)
    expect(resultado[1].porcentaje).toBe(20)
  })

  it('ignora los movimientos de ingreso: solo agrupa gastos', () => {
    const movimientos = [
      { tipo: 'ingreso', monto: 100000, categoria: null },
      { tipo: 'gasto', monto: 30000, categoria: CATEGORIA_VARIABLE },
    ]

    const resultado = agruparGastosPorCategoria(movimientos, 30000, 'Sin categoría')

    expect(resultado).toHaveLength(1)
    expect(resultado[0].id).toBe('cat-comida')
  })

  it('caso límite: totalGastos en 0 no divide entre cero, el porcentaje queda en 0', () => {
    const movimientos = [{ tipo: 'gasto', monto: 10000, categoria: CATEGORIA_VARIABLE }]

    const resultado = agruparGastosPorCategoria(movimientos, 0, 'Sin categoría')

    expect(resultado[0].porcentaje).toBe(0)
  })

  it('caso vacío: sin movimientos, devuelve un arreglo vacío', () => {
    expect(agruparGastosPorCategoria([], 0, 'Sin categoría')).toEqual([])
  })

  it('agrupa los retiros aparte, bajo un ítem propio "Retiros/Efectivo" (no junto a "sin categoría")', () => {
    const movimientos = [
      { tipo: 'retiro', monto: 500000, categoria: null },
      { tipo: 'gasto', monto: 30000, categoria: CATEGORIA_VARIABLE },
    ]

    const resultado = agruparGastosPorCategoria(movimientos, 530000, 'Sin categoría', 'Retiros/Efectivo')

    expect(resultado).toHaveLength(2)
    expect(resultado[0]).toEqual({
      id: 'retiros',
      nombre: 'Retiros/Efectivo',
      icono: 'banknote',
      color: '#f2795b',
      monto: 500000,
      porcentaje: 94, // 500.000 / 530.000
    })
    expect(resultado[1].id).toBe('cat-comida')
  })

  it('no mezcla los retiros con los gastos "sin categoría" cuando ambos aparecen en el mismo periodo', () => {
    const movimientos = [
      { tipo: 'retiro', monto: 100000, categoria: null },
      { tipo: 'gasto', monto: 20000, categoria: null },
    ]

    const resultado = agruparGastosPorCategoria(movimientos, 120000, 'Sin categoría', 'Retiros/Efectivo')

    expect(resultado.map((item) => item.id).sort()).toEqual(['retiros', 'sin-categoria'])
  })

  it('sin retiros en el periodo, no agrega el ítem "Retiros/Efectivo"', () => {
    const movimientos = [{ tipo: 'gasto', monto: 30000, categoria: CATEGORIA_VARIABLE }]

    const resultado = agruparGastosPorCategoria(movimientos, 30000, 'Sin categoría', 'Retiros/Efectivo')

    expect(resultado.some((item) => item.id === 'retiros')).toBe(false)
  })
})

describe('agruparPorMes', () => {
  it('siempre devuelve los 12 meses del año, en orden, incluso sin movimientos', () => {
    const resultado = agruparPorMes([])

    expect(resultado).toHaveLength(12)
    expect(resultado.map((dato) => dato.mes)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(resultado.every((dato) => dato.ingresos === 0 && dato.gastos === 0)).toBe(true)
  })

  it('suma ingresos y gastos por separado dentro de cada mes calendario', () => {
    const movimientos = [
      { tipo: 'ingreso', monto: 1000000, fecha: '2026-01-05' },
      { tipo: 'gasto', monto: 200000, fecha: '2026-01-10' },
      { tipo: 'gasto', monto: 100000, fecha: '2026-01-20' },
      { tipo: 'gasto', monto: 50000, fecha: '2026-03-15' },
    ]

    const resultado = agruparPorMes(movimientos)

    expect(resultado[0]).toEqual({ mes: 0, ingresos: 1000000, gastos: 300000 }) // enero
    expect(resultado[2]).toEqual({ mes: 2, ingresos: 0, gastos: 50000 }) // marzo
    expect(resultado[1]).toEqual({ mes: 1, ingresos: 0, gastos: 0 }) // febrero, sin actividad
  })

  it('ignora los traslados al sumar ingresos/gastos de cada mes', () => {
    const movimientos = [
      { tipo: 'traslado', monto: 999999, fecha: '2026-05-01' },
      { tipo: 'gasto', monto: 40000, fecha: '2026-05-02' },
    ]

    const resultado = agruparPorMes(movimientos)

    expect(resultado[4]).toEqual({ mes: 4, ingresos: 0, gastos: 40000 }) // mayo
  })

  it('suma los retiros al gasto de cada mes, igual que un gasto categorizado', () => {
    const movimientos = [
      { tipo: 'retiro', monto: 60000, fecha: '2026-05-01' },
      { tipo: 'gasto', monto: 40000, fecha: '2026-05-02' },
    ]

    const resultado = agruparPorMes(movimientos)

    expect(resultado[4]).toEqual({ mes: 4, ingresos: 0, gastos: 100000 }) // mayo
  })
})
