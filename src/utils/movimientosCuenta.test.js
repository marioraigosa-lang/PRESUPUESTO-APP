import { describe, expect, it } from 'vitest'
import { esEntradaEnCuenta, calcularResumenCuenta } from './movimientosCuenta'

const CUENTA_A = 'cuenta-a'
const CUENTA_B = 'cuenta-b'

describe('esEntradaEnCuenta', () => {
  it('un ingreso siempre entra a la cuenta', () => {
    const movimiento = { tipo: 'ingreso', cuenta_destino_id: null }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(true)
  })

  it('un gasto siempre sale de la cuenta', () => {
    const movimiento = { tipo: 'gasto', cuenta_destino_id: null }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(false)
  })

  it('un traslado entra cuando esta cuenta es el destino', () => {
    const movimiento = { tipo: 'traslado', cuenta_destino_id: CUENTA_A }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(true)
  })

  it('un traslado sale cuando esta cuenta es el origen (no el destino)', () => {
    const movimiento = { tipo: 'traslado', cuenta_destino_id: CUENTA_B }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(false)
  })

  it('caso borde: tipo desconocido/sin definir se trata como salida, igual que un traslado que no es el destino', () => {
    const movimiento = { tipo: 'otro', cuenta_destino_id: null }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(false)
  })
})

describe('calcularResumenCuenta', () => {
  it('suma un ingreso a totalIngresos y lo incluye en la lista', () => {
    const movimientos = [{ id: 1, tipo: 'ingreso', monto: 100000 }]

    const resultado = calcularResumenCuenta(movimientos, CUENTA_A)

    expect(resultado.totalIngresos).toBe(100000)
    expect(resultado.totalEgresos).toBe(0)
    expect(resultado.neto).toBe(100000)
    expect(resultado.listaMovimientos).toEqual(movimientos)
  })

  it('suma un gasto a totalEgresos pero lo excluye de la lista', () => {
    const movimientos = [{ id: 1, tipo: 'gasto', monto: 40000 }]

    const resultado = calcularResumenCuenta(movimientos, CUENTA_A)

    expect(resultado.totalIngresos).toBe(0)
    expect(resultado.totalEgresos).toBe(40000)
    expect(resultado.neto).toBe(-40000)
    expect(resultado.listaMovimientos).toEqual([])
  })

  it('un traslado de entrada (esta cuenta es el destino) suma a ingresos y aparece en la lista', () => {
    const movimiento = { id: 1, tipo: 'traslado', monto: 50000, cuenta_destino_id: CUENTA_A }

    const resultado = calcularResumenCuenta([movimiento], CUENTA_A)

    expect(resultado.totalIngresos).toBe(50000)
    expect(resultado.totalEgresos).toBe(0)
    expect(resultado.listaMovimientos).toEqual([movimiento])
  })

  it('un traslado de salida (esta cuenta es el origen) suma a egresos y también aparece en la lista', () => {
    const movimiento = { id: 1, tipo: 'traslado', monto: 50000, cuenta_destino_id: CUENTA_B }

    const resultado = calcularResumenCuenta([movimiento], CUENTA_A)

    expect(resultado.totalIngresos).toBe(0)
    expect(resultado.totalEgresos).toBe(50000)
    expect(resultado.listaMovimientos).toEqual([movimiento])
  })

  it('mezcla ingresos, gastos y traslados (en ambas direcciones) en un solo periodo', () => {
    const ingreso = { id: 1, tipo: 'ingreso', monto: 200000 }
    const gasto = { id: 2, tipo: 'gasto', monto: 30000 }
    const trasladoEntrada = { id: 3, tipo: 'traslado', monto: 10000, cuenta_destino_id: CUENTA_A }
    const trasladoSalida = { id: 4, tipo: 'traslado', monto: 5000, cuenta_destino_id: CUENTA_B }

    const resultado = calcularResumenCuenta([ingreso, gasto, trasladoEntrada, trasladoSalida], CUENTA_A)

    expect(resultado.totalIngresos).toBe(210000) // ingreso + traslado de entrada
    expect(resultado.totalEgresos).toBe(35000) // gasto + traslado de salida
    expect(resultado.neto).toBe(175000)
    expect(resultado.listaMovimientos).toEqual([ingreso, trasladoEntrada, trasladoSalida]) // el gasto queda fuera
  })

  it('caso vacío: sin movimientos, todos los totales quedan en 0 y la lista vacía', () => {
    const resultado = calcularResumenCuenta([], CUENTA_A)

    expect(resultado).toEqual({ totalIngresos: 0, totalEgresos: 0, neto: 0, listaMovimientos: [] })
  })
})
