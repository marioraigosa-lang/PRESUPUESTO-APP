import { describe, expect, it } from 'vitest'
import {
  resumenCategoriaViaje,
  colorBarraPresupuesto,
  gastosSinCategoria,
  totalesPorMoneda,
  resumenPorMonedaYCategoria,
} from './resumenViaje'

describe('resumenCategoriaViaje', () => {
  const categoria = { id: 'cat-1', presupuesto: 500, moneda: 'USD' }

  it('suma solo los gastos de la categoría en la misma moneda del presupuesto', () => {
    const gastos = [
      { categoria_viaje_id: 'cat-1', moneda: 'USD', monto: 100 },
      { categoria_viaje_id: 'cat-1', moneda: 'USD', monto: 50 },
      { categoria_viaje_id: 'cat-2', moneda: 'USD', monto: 999 }, // de otra categoría
    ]

    const { ejecutado, porcentaje } = resumenCategoriaViaje(categoria, gastos)

    expect(ejecutado).toBe(150)
    expect(porcentaje).toBe(30)
  })

  it('ejecutado menor al presupuesto', () => {
    const gastos = [{ categoria_viaje_id: 'cat-1', moneda: 'USD', monto: 200 }]
    const { porcentaje } = resumenCategoriaViaje(categoria, gastos)
    expect(porcentaje).toBe(40)
  })

  it('ejecutado igual al presupuesto (100%)', () => {
    const gastos = [{ categoria_viaje_id: 'cat-1', moneda: 'USD', monto: 500 }]
    const { ejecutado, porcentaje } = resumenCategoriaViaje(categoria, gastos)
    expect(ejecutado).toBe(500)
    expect(porcentaje).toBe(100)
  })

  it('ejecutado mayor al presupuesto (sobregasto)', () => {
    const gastos = [{ categoria_viaje_id: 'cat-1', moneda: 'USD', monto: 750 }]
    const { porcentaje } = resumenCategoriaViaje(categoria, gastos)
    expect(porcentaje).toBe(150)
  })

  it('presupuesto 0 devuelve porcentaje null, sin dividir por cero', () => {
    const categoriaSinPresupuesto = { id: 'cat-1', presupuesto: 0, moneda: 'USD' }
    const gastos = [{ categoria_viaje_id: 'cat-1', moneda: 'USD', monto: 100 }]

    const { ejecutado, porcentaje } = resumenCategoriaViaje(categoriaSinPresupuesto, gastos)

    expect(ejecutado).toBe(100)
    expect(porcentaje).toBeNull()
  })

  it('gastos en una moneda distinta a la del presupuesto NO se suman al ejecutado ni al porcentaje', () => {
    const gastos = [
      { categoria_viaje_id: 'cat-1', moneda: 'USD', monto: 100 },
      { categoria_viaje_id: 'cat-1', moneda: 'COP', monto: 50000 },
      { categoria_viaje_id: 'cat-1', moneda: 'COP', monto: 20000 },
    ]

    const { ejecutado, porcentaje, otrasMonedas } = resumenCategoriaViaje(categoria, gastos)

    expect(ejecutado).toBe(100)
    expect(porcentaje).toBe(20)
    expect(otrasMonedas).toEqual({ COP: 70000 })
  })

  it('sin gastos, ejecutado es 0 y porcentaje 0', () => {
    const { ejecutado, porcentaje, otrasMonedas } = resumenCategoriaViaje(categoria, [])
    expect(ejecutado).toBe(0)
    expect(porcentaje).toBe(0)
    expect(otrasMonedas).toEqual({})
  })
})

describe('colorBarraPresupuesto', () => {
  it('devuelve null si no hay presupuesto (porcentaje null)', () => {
    expect(colorBarraPresupuesto(null)).toBeNull()
  })

  it('devuelve mint por debajo del 75%', () => {
    expect(colorBarraPresupuesto(0)).toBe('mint')
    expect(colorBarraPresupuesto(50)).toBe('mint')
    expect(colorBarraPresupuesto(74.9)).toBe('mint')
  })

  it('devuelve gold entre 75% y 100% (inclusive)', () => {
    expect(colorBarraPresupuesto(75)).toBe('gold')
    expect(colorBarraPresupuesto(90)).toBe('gold')
    expect(colorBarraPresupuesto(100)).toBe('gold')
  })

  it('devuelve coral por encima del 100% (sobregasto)', () => {
    expect(colorBarraPresupuesto(100.1)).toBe('coral')
    expect(colorBarraPresupuesto(150)).toBe('coral')
  })
})

describe('gastosSinCategoria', () => {
  it('devuelve solo los gastos con categoria_viaje_id null', () => {
    const gastos = [
      { id: 1, categoria_viaje_id: 'cat-1' },
      { id: 2, categoria_viaje_id: null },
      { id: 3, categoria_viaje_id: 'cat-2' },
      { id: 4, categoria_viaje_id: null },
    ]

    expect(gastosSinCategoria(gastos).map((g) => g.id)).toEqual([2, 4])
  })

  it('devuelve un arreglo vacío si todos tienen categoría', () => {
    const gastos = [{ id: 1, categoria_viaje_id: 'cat-1' }]
    expect(gastosSinCategoria(gastos)).toEqual([])
  })
})

describe('totalesPorMoneda', () => {
  it('agrupa y suma montos por moneda', () => {
    const gastos = [
      { moneda: 'USD', monto: 10 },
      { moneda: 'COP', monto: 5000 },
      { moneda: 'USD', monto: 5 },
    ]

    expect(totalesPorMoneda(gastos)).toEqual({ USD: 15, COP: 5000 })
  })

  it('devuelve un objeto vacío para un arreglo vacío', () => {
    expect(totalesPorMoneda([])).toEqual({})
  })
})

describe('resumenPorMonedaYCategoria', () => {
  const categoriaComida = { id: 'cat-comida', nombre: 'Alimentación', emoji: '🍔' }
  const categoriaHotel = { id: 'cat-hotel', nombre: 'Hotel', emoji: '🏨' }
  const categorias = [categoriaComida, categoriaHotel]

  it('suma varios gastos en una sola moneda y los agrupa por categoría', () => {
    const gastos = [
      { categoria_viaje_id: 'cat-comida', moneda: 'USD', monto: 20 },
      { categoria_viaje_id: 'cat-comida', moneda: 'USD', monto: 15 },
      { categoria_viaje_id: 'cat-hotel', moneda: 'USD', monto: 300 },
    ]

    const resumen = resumenPorMonedaYCategoria(gastos, categorias)

    expect(resumen).toEqual([
      {
        moneda: 'USD',
        total: 335,
        categorias: [
          { categoria: categoriaHotel, total: 300 },
          { categoria: categoriaComida, total: 35 },
        ],
      },
    ])
  })

  it('separa los totales de gastos en varias monedas sin mezclarlos ni convertirlos', () => {
    const gastos = [
      { categoria_viaje_id: 'cat-comida', moneda: 'COP', monto: 50000 },
      { categoria_viaje_id: 'cat-hotel', moneda: 'USD', monto: 200 },
      { categoria_viaje_id: 'cat-hotel', moneda: 'EUR', monto: 90 },
      { categoria_viaje_id: 'cat-comida', moneda: 'COP', monto: 30000 },
    ]

    const resumen = resumenPorMonedaYCategoria(gastos, categorias)

    // El orden de las monedas es siempre COP, USD, EUR (el fijo de
    // utils/monedas.js), sin importar en qué orden se registraron los gastos.
    expect(resumen.map((r) => r.moneda)).toEqual(['COP', 'USD', 'EUR'])
    expect(resumen.find((r) => r.moneda === 'COP').total).toBe(80000)
    expect(resumen.find((r) => r.moneda === 'USD').total).toBe(200)
    expect(resumen.find((r) => r.moneda === 'EUR').total).toBe(90)
  })

  it('agrupa los gastos sin categoría bajo categoria: null', () => {
    const gastos = [
      { categoria_viaje_id: null, moneda: 'COP', monto: 10000 },
      { categoria_viaje_id: null, moneda: 'COP', monto: 5000 },
      { categoria_viaje_id: 'cat-comida', moneda: 'COP', monto: 2000 },
    ]

    const resumen = resumenPorMonedaYCategoria(gastos, categorias)

    expect(resumen).toEqual([
      {
        moneda: 'COP',
        total: 17000,
        categorias: [
          { categoria: null, total: 15000 },
          { categoria: categoriaComida, total: 2000 },
        ],
      },
    ])
  })

  it('devuelve un arreglo vacío si el viaje no tiene gastos', () => {
    expect(resumenPorMonedaYCategoria([], categorias)).toEqual([])
  })
})
