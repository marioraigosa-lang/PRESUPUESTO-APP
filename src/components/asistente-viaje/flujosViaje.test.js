import { describe, expect, it } from 'vitest'
import { flujosViaje } from './flujosViaje'

describe('flujosViaje', () => {
  it('siempre son los mismos 4 pasos, en el mismo orden', () => {
    expect(flujosViaje()).toEqual(['origenDestino', 'fechas', 'personas', 'categorias'])
  })
})
