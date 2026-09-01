import { describe, expect, it } from 'vitest'
import { calcularResumenGastosFijos } from './resumenGastosFijos'

describe('calcularResumenGastosFijos', () => {
  it('ninguno pagado: totalPagado y porcentaje en 0, totalPendiente igual al total', () => {
    const gastos = [
      { id: 1, monto: 500000, pagado: false },
      { id: 2, monto: 300000, pagado: false },
    ]

    const resultado = calcularResumenGastosFijos(gastos)

    expect(resultado.total).toBe(800000)
    expect(resultado.totalPagado).toBe(0)
    expect(resultado.totalPendiente).toBe(800000)
    expect(resultado.porcentaje).toBe(0)
    expect(resultado.pagadosCantidad).toBe(0)
    expect(resultado.cantidadTotal).toBe(2)
  })

  it('todos pagados: totalPendiente en 0 y porcentaje en 100', () => {
    const gastos = [
      { id: 1, monto: 500000, pagado: true },
      { id: 2, monto: 300000, pagado: true },
    ]

    const resultado = calcularResumenGastosFijos(gastos)

    expect(resultado.total).toBe(800000)
    expect(resultado.totalPagado).toBe(800000)
    expect(resultado.totalPendiente).toBe(0)
    expect(resultado.porcentaje).toBe(100)
    expect(resultado.pagadosCantidad).toBe(2)
    expect(resultado.cantidadTotal).toBe(2)
  })

  it('algunos pagados: totales y porcentaje reflejan solo la parte pagada', () => {
    const gastos = [
      { id: 1, monto: 600000, pagado: true },
      { id: 2, monto: 400000, pagado: false },
    ]

    const resultado = calcularResumenGastosFijos(gastos)

    expect(resultado.total).toBe(1000000)
    expect(resultado.totalPagado).toBe(600000)
    expect(resultado.totalPendiente).toBe(400000)
    expect(resultado.porcentaje).toBe(60)
    expect(resultado.pagadosCantidad).toBe(1)
    expect(resultado.cantidadTotal).toBe(2)
  })

  it('lista vacía: todos los totales en 0, sin dividir entre cero', () => {
    const resultado = calcularResumenGastosFijos([])

    expect(resultado).toEqual({
      total: 0,
      totalPagado: 0,
      totalPendiente: 0,
      porcentaje: 0,
      pagadosCantidad: 0,
      cantidadTotal: 0,
    })
  })

  it('caso límite: total en 0 (gastos de monto 0) no divide entre cero, el porcentaje queda en 0', () => {
    const gastos = [{ id: 1, monto: 0, pagado: false }]

    const resultado = calcularResumenGastosFijos(gastos)

    expect(resultado.total).toBe(0)
    expect(resultado.porcentaje).toBe(0)
  })

  it('redondea el porcentaje a un número entero', () => {
    const gastos = [
      { id: 1, monto: 100, pagado: true },
      { id: 2, monto: 200, pagado: false },
    ]

    const resultado = calcularResumenGastosFijos(gastos)

    // 100 / 300 = 33.33... -> redondeado a 33
    expect(resultado.porcentaje).toBe(33)
  })
})
