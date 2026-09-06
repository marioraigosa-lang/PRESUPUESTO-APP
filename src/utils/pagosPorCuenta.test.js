import { describe, expect, it } from 'vitest'
import { calcularPagosPorCuenta } from './pagosPorCuenta'

const pago = (cuentaId, monto) => ({ tipo: 'pago_tarjeta', cuenta_id: cuentaId, monto })

describe('calcularPagosPorCuenta', () => {
  it('un solo pagador: suma sus pagos y no marca varios pagadores', () => {
    const resultado = calcularPagosPorCuenta([pago('cta-a', 30000), pago('cta-a', 20000)])

    expect(resultado).toEqual({
      cuentas: [{ cuentaId: 'cta-a', total: 50000 }],
      hayVariosPagadores: false,
      cuentaSugerida: 'cta-a',
    })
  })

  it('varios pagadores: ordena de mayor a menor y sugiere la que más pagó', () => {
    const resultado = calcularPagosPorCuenta([
      pago('cta-a', 40000),
      pago('cta-b', 60000),
      pago('cta-a', 20000),
    ])

    expect(resultado.cuentas).toEqual([
      { cuentaId: 'cta-a', total: 60000 },
      { cuentaId: 'cta-b', total: 60000 },
    ])
    expect(resultado.hayVariosPagadores).toBe(true)
    // Empate en 60000: gana 'cta-a' porque aparece primero en la lista.
    expect(resultado.cuentaSugerida).toBe('cta-a')
  })

  it('empate limpio entre dos cuentas: sugiere la primera que aparece', () => {
    const resultado = calcularPagosPorCuenta([pago('cta-b', 50000), pago('cta-a', 50000)])

    expect(resultado.hayVariosPagadores).toBe(true)
    expect(resultado.cuentaSugerida).toBe('cta-b')
    expect(resultado.cuentas).toHaveLength(2)
  })

  it('lista vacía: sin cuentas, sin pagadores, sin sugerida', () => {
    expect(calcularPagosPorCuenta([])).toEqual({
      cuentas: [],
      hayVariosPagadores: false,
      cuentaSugerida: null,
    })
  })

  it('sin argumento: se comporta como lista vacía', () => {
    expect(calcularPagosPorCuenta()).toEqual({
      cuentas: [],
      hayVariosPagadores: false,
      cuentaSugerida: null,
    })
  })

  it('ignora gastos y pagos sin cuenta_id', () => {
    const resultado = calcularPagosPorCuenta([
      { tipo: 'gasto', cuenta_id: null, tarjeta_id: 'tar-1', monto: 99999 },
      { tipo: 'pago_tarjeta', cuenta_id: null, monto: 10000 },
      pago('cta-a', 15000),
    ])

    expect(resultado).toEqual({
      cuentas: [{ cuentaId: 'cta-a', total: 15000 }],
      hayVariosPagadores: false,
      cuentaSugerida: 'cta-a',
    })
  })
})
