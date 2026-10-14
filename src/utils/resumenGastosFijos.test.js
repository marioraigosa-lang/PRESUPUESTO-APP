import { describe, expect, it } from 'vitest'
import { calcularResumenGastosFijos, combinarGastosConMes } from './resumenGastosFijos'

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

describe('combinarGastosConMes', () => {
  const plantillas = [
    { id: 1, nombre: 'Arriendo', monto: 1200000, dia_pago: 5 },
    { id: 2, nombre: 'Internet', monto: 90000, dia_pago: 10 },
  ]

  it('sin movimientos ese mes: todos pendientes, con el monto de la plantilla', () => {
    const resultado = combinarGastosConMes(plantillas, {})

    expect(resultado).toEqual([
      { ...plantillas[0], pagado: false, pagadoConTarjeta: null },
      { ...plantillas[1], pagado: false, pagadoConTarjeta: null },
    ])
  })

  it('pagado: usa el monto del movimiento del mes, aunque la plantilla haya cambiado después', () => {
    // El arriendo se pagó a 1.000.000 y luego se subió la plantilla a 1.200.000.
    const resultado = combinarGastosConMes(plantillas, { 1: { id: 10, gasto_fijo_id: 1, monto: 1000000 } })

    expect(resultado[0]).toMatchObject({ id: 1, pagado: true, monto: 1000000 })
    expect(resultado[1]).toMatchObject({ id: 2, pagado: false, monto: 90000 })
  })

  it('convierte a número el monto del movimiento si llega como texto', () => {
    const resultado = combinarGastosConMes(plantillas, { 2: { monto: '85000.50' } })

    expect(resultado[1].monto).toBe(85000.5)
  })

  it('placeholder optimista sin monto: cuenta como pagado con el monto de la plantilla', () => {
    const resultado = combinarGastosConMes(plantillas, { 1: { pendienteDeConfirmar: true } })

    expect(resultado[0]).toMatchObject({ pagado: true, monto: 1200000 })
  })

  it('expone el nombre de la tarjeta si el pago del mes fue con tarjeta', () => {
    const resultado = combinarGastosConMes(plantillas, {
      2: { monto: 90000, tarjeta_id: 't1', tarjeta: { nombre: 'Visa' } },
    })

    expect(resultado[1].pagadoConTarjeta).toBe('Visa')
    expect(resultado[0].pagadoConTarjeta).toBeNull()
  })

  it('el resumen suma lo realmente pagado y lo pendiente según la plantilla', () => {
    const gastosConEstado = combinarGastosConMes(plantillas, { 1: { monto: 1000000 } })

    const resumen = calcularResumenGastosFijos(gastosConEstado)

    expect(resumen.totalPagado).toBe(1000000)
    expect(resumen.totalPendiente).toBe(90000)
    expect(resumen.total).toBe(1090000)
  })
})
