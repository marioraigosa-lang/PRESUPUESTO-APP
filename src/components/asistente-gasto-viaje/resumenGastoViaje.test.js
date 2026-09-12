import { describe, expect, it } from 'vitest'
import { chipsResumenGastoViaje } from './resumenGastoViaje'

const categorias = [{ id: 'cat1', nombre: 'Comida', icono: 'utensils', color: '#4fd1a5' }]

describe('chipsResumenGastoViaje', () => {
  it('sin nada elegido todavía, no arma ningún chip', () => {
    expect(chipsResumenGastoViaje({ categoriaId: '' }, { categorias })).toEqual([])
  })

  it('con categoría elegida, arma su chip con icono y color', () => {
    const chips = chipsResumenGastoViaje({ categoriaId: 'cat1' }, { categorias })
    expect(chips).toEqual([{ paso: 'categoria', texto: 'Comida', icono: 'utensils', color: '#4fd1a5' }])
  })

  it('agrega el chip de monto solo si se pasa montoFormateado', () => {
    const chips = chipsResumenGastoViaje({ categoriaId: 'cat1' }, { categorias, montoFormateado: '$45.000' })
    expect(chips).toEqual([
      { paso: 'categoria', texto: 'Comida', icono: 'utensils', color: '#4fd1a5' },
      { paso: 'monto', texto: '$45.000' },
    ])
  })

  it('el chip de fecha no lleva "paso" -- nunca es tocable', () => {
    const chips = chipsResumenGastoViaje({ categoriaId: '' }, { categorias, fechaFormateada: '12 mar' })
    expect(chips).toEqual([{ texto: '12 mar' }])
  })
})
