import { describe, expect, it } from 'vitest'
import { calcularProgresoPresupuesto } from './progresoPresupuesto'

// calcularProgresoPresupuesto es el único cálculo compartido entre
// CategoriaGasto.jsx (fila de "Gastos variables" en Inicio) y
// DetalleCategoria.jsx: un bug acá se propaga a las dos pantallas a la vez,
// sin que ninguna arroje un error visible -- solo un porcentaje o un
// "excedido" incorrectos.
describe('calcularProgresoPresupuesto', () => {
  describe('sin presupuesto (categoría "sin tope")', () => {
    it('presupuesto en 0: tieneTope false, sin importar cuánto se haya gastado', () => {
      expect(calcularProgresoPresupuesto(0, 500)).toEqual({
        tieneTope: false,
        excedido: false,
        porcentaje: 0,
      })
    })

    it('presupuesto null: se trata igual que sin tope', () => {
      expect(calcularProgresoPresupuesto(null, 500)).toEqual({
        tieneTope: false,
        excedido: false,
        porcentaje: 0,
      })
    })

    it('presupuesto undefined: se trata igual que sin tope', () => {
      expect(calcularProgresoPresupuesto(undefined, 500)).toEqual({
        tieneTope: false,
        excedido: false,
        porcentaje: 0,
      })
    })
  })

  describe('con presupuesto definido', () => {
    it('gastado en 0: tieneTope true, sin excedido, 0%', () => {
      expect(calcularProgresoPresupuesto(1000, 0)).toEqual({
        tieneTope: true,
        excedido: false,
        porcentaje: 0,
      })
    })

    it('dentro del presupuesto: calcula el porcentaje real, sin excedido', () => {
      expect(calcularProgresoPresupuesto(1000, 500)).toEqual({
        tieneTope: true,
        excedido: false,
        porcentaje: 50,
      })
    })

    it('redondea el porcentaje a un entero', () => {
      // 100/300 = 33.33...% -> se redondea a 33, no se trunca ni se deja con
      // decimales (Math.round, no Math.floor).
      expect(calcularProgresoPresupuesto(300, 100).porcentaje).toBe(33)
    })

    it('frontera: exactamente en 100% NO cuenta como excedido', () => {
      // gastado > presupuesto es estrictamente mayor -- gastar EXACTAMENTE
      // el presupuesto no es "pasarse".
      expect(calcularProgresoPresupuesto(1000, 1000)).toEqual({
        tieneTope: true,
        excedido: false,
        porcentaje: 100,
      })
    })

    it('excedido: gastar más del presupuesto marca excedido true', () => {
      expect(calcularProgresoPresupuesto(1000, 1500)).toEqual({
        tieneTope: true,
        excedido: true,
        porcentaje: 100,
      })
    })

    it('excedido al doble: el porcentaje NUNCA pasa de 100 (se limita con Math.min)', () => {
      // Sin el Math.min(100, ...), esto daría 200% y rompería cualquier
      // barra de progreso que use este porcentaje como ancho en CSS.
      const resultado = calcularProgresoPresupuesto(1000, 2000)
      expect(resultado.excedido).toBe(true)
      expect(resultado.porcentaje).toBe(100)
    })

    it('excedido apenas por encima (101%): sigue marcando excedido aunque el porcentaje se vea igual a un 100% exacto', () => {
      const enElLimite = calcularProgresoPresupuesto(1000, 1000)
      const pasadoPorPoco = calcularProgresoPresupuesto(1000, 1010)
      expect(enElLimite.excedido).toBe(false)
      expect(pasadoPorPoco.excedido).toBe(true)
      expect(pasadoPorPoco.porcentaje).toBe(100)
    })
  })
})
