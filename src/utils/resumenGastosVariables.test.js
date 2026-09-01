import { describe, expect, it } from 'vitest'
import { calcularResumenGastosVariables } from './resumenGastosVariables'

describe('calcularResumenGastosVariables', () => {
  it('sin categorías: todos los totales en 0 y no hay excedido', () => {
    const resultado = calcularResumenGastosVariables([])

    expect(resultado).toEqual({
      totalGastado: 0,
      totalTope: 0,
      excedidoTotal: false,
      cantidadConTope: 0,
    })
  })

  it('categorías sin tope: suma lo gastado pero totalTope queda en 0 y no hay excedido', () => {
    const categorias = [
      { id: 1, gastado: 50000, presupuesto: null },
      { id: 2, gastado: 30000, presupuesto: 0 },
    ]

    const resultado = calcularResumenGastosVariables(categorias)

    expect(resultado.totalGastado).toBe(80000)
    expect(resultado.totalTope).toBe(0)
    expect(resultado.excedidoTotal).toBe(false)
    expect(resultado.cantidadConTope).toBe(0)
  })

  it('dentro del presupuesto: gastado menor que el tope total, no excedido', () => {
    const categorias = [
      { id: 1, gastado: 40000, presupuesto: 100000 },
      { id: 2, gastado: 20000, presupuesto: 50000 },
    ]

    const resultado = calcularResumenGastosVariables(categorias)

    expect(resultado.totalGastado).toBe(60000)
    expect(resultado.totalTope).toBe(150000)
    expect(resultado.excedidoTotal).toBe(false)
    expect(resultado.cantidadConTope).toBe(2)
  })

  it('excedido: gastado mayor que el tope total', () => {
    const categorias = [{ id: 1, gastado: 120000, presupuesto: 100000 }]

    const resultado = calcularResumenGastosVariables(categorias)

    expect(resultado.totalGastado).toBe(120000)
    expect(resultado.totalTope).toBe(100000)
    expect(resultado.excedidoTotal).toBe(true)
  })

  it('mezcla de categorías con y sin tope: el tope total solo considera las que tienen presupuesto', () => {
    const categorias = [
      { id: 1, gastado: 30000, presupuesto: 50000 },
      { id: 2, gastado: 70000, presupuesto: null },
    ]

    const resultado = calcularResumenGastosVariables(categorias)

    expect(resultado.totalGastado).toBe(100000) // 30.000 + 70.000, incluye la sin tope
    expect(resultado.totalTope).toBe(50000) // solo la categoría con presupuesto
    expect(resultado.cantidadConTope).toBe(1)
  })

  it('caso límite: gastado igual al tope no cuenta como excedido (excedidoTotal exige mayor estricto)', () => {
    const categorias = [{ id: 1, gastado: 100000, presupuesto: 100000 }]

    const resultado = calcularResumenGastosVariables(categorias)

    expect(resultado.excedidoTotal).toBe(false)
  })
})
