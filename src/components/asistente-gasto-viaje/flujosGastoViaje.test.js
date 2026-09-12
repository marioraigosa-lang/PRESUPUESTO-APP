import { describe, expect, it } from 'vitest'
import { flujosGastoViaje } from './flujosGastoViaje'

function borrador(campos = {}) {
  return {
    categoriaId: '',
    categoriaPreseleccionadaId: '',
    ...campos,
  }
}

describe('flujosGastoViaje', () => {
  it('sin categoría preseleccionada, pide categoría, monto y concepto', () => {
    expect(flujosGastoViaje(borrador())).toEqual(['categoria', 'monto', 'concepto'])
  })

  it('con categoría preseleccionada, salta el paso de categoría', () => {
    expect(flujosGastoViaje(borrador({ categoriaPreseleccionadaId: 'cat1' }))).toEqual(['monto', 'concepto'])
  })
})
