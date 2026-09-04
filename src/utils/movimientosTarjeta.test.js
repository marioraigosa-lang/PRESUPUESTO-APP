import { describe, expect, it } from 'vitest'
import { calcularResumenTarjeta } from './movimientosTarjeta'

describe('calcularResumenTarjeta', () => {
  it('caso vacío: todos los totales quedan en 0', () => {
    expect(calcularResumenTarjeta([])).toEqual({ totalGastado: 0, totalPagado: 0, neto: 0 })
  })

  it('suma los gastos a totalGastado', () => {
    const movimientos = [
      { id: 1, tipo: 'gasto', monto: 30000 },
      { id: 2, tipo: 'gasto', monto: 20000 },
    ]

    const resultado = calcularResumenTarjeta(movimientos)

    expect(resultado.totalGastado).toBe(50000)
    expect(resultado.totalPagado).toBe(0)
    expect(resultado.neto).toBe(50000)
  })

  it('suma los pagos a totalPagado', () => {
    const movimientos = [{ id: 1, tipo: 'pago_tarjeta', monto: 40000 }]

    const resultado = calcularResumenTarjeta(movimientos)

    expect(resultado.totalGastado).toBe(0)
    expect(resultado.totalPagado).toBe(40000)
    expect(resultado.neto).toBe(-40000)
  })

  it('mezcla gastos y pagos: neto es la diferencia (gastado - pagado)', () => {
    const movimientos = [
      { id: 1, tipo: 'gasto', monto: 100000 },
      { id: 2, tipo: 'pago_tarjeta', monto: 40000 },
    ]

    const resultado = calcularResumenTarjeta(movimientos)

    expect(resultado.totalGastado).toBe(100000)
    expect(resultado.totalPagado).toBe(40000)
    expect(resultado.neto).toBe(60000)
  })

  it('pagó más de lo que gastó en el periodo: neto queda negativo', () => {
    const movimientos = [
      { id: 1, tipo: 'gasto', monto: 20000 },
      { id: 2, tipo: 'pago_tarjeta', monto: 50000 },
    ]

    const resultado = calcularResumenTarjeta(movimientos)

    expect(resultado.neto).toBe(-30000)
  })
})
