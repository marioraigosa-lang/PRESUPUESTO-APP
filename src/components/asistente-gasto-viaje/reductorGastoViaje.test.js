import { describe, expect, it } from 'vitest'
import { estadoInicialGastoViaje, reductorGastoViaje } from './reductorGastoViaje'
import { fechaLocalISO } from '../../utils/formatoFecha'
import { MONEDA_POR_DEFECTO } from '../../utils/monedas'

describe('estadoInicialGastoViaje', () => {
  it('sin preselección, arranca vacío en el paso 0 con fecha de hoy y moneda por defecto', () => {
    expect(estadoInicialGastoViaje()).toEqual({
      categoriaId: '',
      fecha: fechaLocalISO(),
      monto: '',
      moneda: MONEDA_POR_DEFECTO,
      descripcion: '',
      indicePaso: 0,
      categoriaPreseleccionadaId: '',
    })
  })

  it('con categoriaPreseleccionadaId, precarga categoriaId', () => {
    const estado = estadoInicialGastoViaje({ categoriaPreseleccionadaId: 'cat1' })
    expect(estado.categoriaId).toBe('cat1')
    expect(estado.categoriaPreseleccionadaId).toBe('cat1')
  })
})

describe('reductorGastoViaje', () => {
  it('PARCHAR fusiona los cambios y avanza un paso', () => {
    const estado = { ...estadoInicialGastoViaje(), indicePaso: 0 }
    const nuevo = reductorGastoViaje(estado, { tipo: 'PARCHAR', cambios: { categoriaId: 'cat2' } })
    expect(nuevo.categoriaId).toBe('cat2')
    expect(nuevo.indicePaso).toBe(1)
  })

  it('ACTUALIZAR fusiona los cambios SIN avanzar de paso (concepto/moneda/fecha se ajustan, no se eligen)', () => {
    const estado = { ...estadoInicialGastoViaje(), indicePaso: 1, descripcion: 'Tax' }
    const nuevo = reductorGastoViaje(estado, { tipo: 'ACTUALIZAR', cambios: { descripcion: 'Taxi' } })
    expect(nuevo.descripcion).toBe('Taxi')
    expect(nuevo.indicePaso).toBe(1)
  })

  it('ACTUALIZAR puede cambiar moneda y fecha sin tocar el resto del borrador', () => {
    const estado = { ...estadoInicialGastoViaje(), monto: '100' }
    const nuevo = reductorGastoViaje(estado, { tipo: 'ACTUALIZAR', cambios: { moneda: 'USD', fecha: '2026-01-05' } })
    expect(nuevo.moneda).toBe('USD')
    expect(nuevo.fecha).toBe('2026-01-05')
    expect(nuevo.monto).toBe('100')
  })

  it('RETROCEDER resta un paso sin bajar de 0', () => {
    const enPaso1 = reductorGastoViaje({ ...estadoInicialGastoViaje(), indicePaso: 2 }, { tipo: 'RETROCEDER' })
    expect(enPaso1.indicePaso).toBe(1)

    const enPaso0 = reductorGastoViaje({ ...estadoInicialGastoViaje(), indicePaso: 0 }, { tipo: 'RETROCEDER' })
    expect(enPaso0.indicePaso).toBe(0)
  })

  it('IR_A_PASO salta directo a un índice sin tocar el resto del borrador', () => {
    const estado = { ...estadoInicialGastoViaje(), categoriaId: 'cat1', indicePaso: 2 }
    const nuevo = reductorGastoViaje(estado, { tipo: 'IR_A_PASO', indice: 0 })
    expect(nuevo.indicePaso).toBe(0)
    expect(nuevo.categoriaId).toBe('cat1')
  })

  it('REINICIAR vuelve al estado inicial con las preselecciones dadas', () => {
    const estado = { ...estadoInicialGastoViaje(), monto: '500', indicePaso: 2 }
    const nuevo = reductorGastoViaje(estado, {
      tipo: 'REINICIAR',
      preselecciones: { categoriaPreseleccionadaId: 'cat1' },
    })
    expect(nuevo).toEqual(estadoInicialGastoViaje({ categoriaPreseleccionadaId: 'cat1' }))
  })
})
