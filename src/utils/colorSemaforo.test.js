import { describe, expect, it } from 'vitest'
import { colorSemaforoLlenado, colorSemaforoPagado } from './colorSemaforo'

const MINT = 'var(--color-mint)'
const GOLD = 'var(--color-gold)'
const CORAL = 'var(--color-coral)'

describe('colorSemaforoLlenado (gastos variables / tarjetas: más lleno = peor)', () => {
  it('menos de 70% es mint', () => {
    expect(colorSemaforoLlenado(0)).toBe(MINT)
    expect(colorSemaforoLlenado(69)).toBe(MINT)
  })

  it('entre 70% y 90% (inclusive) es gold', () => {
    expect(colorSemaforoLlenado(70)).toBe(GOLD)
    expect(colorSemaforoLlenado(85)).toBe(GOLD)
    expect(colorSemaforoLlenado(90)).toBe(GOLD)
  })

  it('más de 90% es coral', () => {
    expect(colorSemaforoLlenado(91)).toBe(CORAL)
    expect(colorSemaforoLlenado(100)).toBe(CORAL)
  })

  it('excedido (más de 100%) sigue siendo coral', () => {
    expect(colorSemaforoLlenado(150)).toBe(CORAL)
  })
})

describe('colorSemaforoPagado (gastos fijos: más lleno = mejor, invertido)', () => {
  it('menos de 50% pagado es coral (todavía falta la mayoría)', () => {
    expect(colorSemaforoPagado(0)).toBe(CORAL)
    expect(colorSemaforoPagado(49)).toBe(CORAL)
  })

  it('entre 50% y 99% pagado es gold', () => {
    expect(colorSemaforoPagado(50)).toBe(GOLD)
    expect(colorSemaforoPagado(75)).toBe(GOLD)
    expect(colorSemaforoPagado(99)).toBe(GOLD)
  })

  it('100% pagado es mint (todo al día)', () => {
    expect(colorSemaforoPagado(100)).toBe(MINT)
  })
})
