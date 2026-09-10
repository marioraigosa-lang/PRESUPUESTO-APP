import { describe, expect, it } from 'vitest'
import { estadoInicialAsistente, reductorAsistente } from './reductorAsistente'

describe('estadoInicialAsistente', () => {
  it('sin preselecciones, arranca vacío en el paso 0', () => {
    expect(estadoInicialAsistente()).toEqual({
      tipo: '',
      tipoPreseleccionado: false,
      origen: 'cuenta',
      cuentaId: '',
      cuentaDestinoId: '',
      tarjetaId: '',
      categoriaId: '',
      monto: '',
      descripcion: '',
      indicePaso: 0,
      cuentaPreseleccionadaId: '',
      categoriaPreseleccionadaId: '',
    })
  })

  it('con cuentaPreseleccionadaId (sin categoría), precarga cuentaId pero NO fija el tipo', () => {
    const estado = estadoInicialAsistente({ cuentaPreseleccionadaId: 'c1' })
    expect(estado.cuentaId).toBe('c1')
    expect(estado.cuentaPreseleccionadaId).toBe('c1')
    expect(estado.tipo).toBe('')
    expect(estado.tipoPreseleccionado).toBe(false)
  })

  it('con categoriaPreseleccionadaId, precarga categoriaId Y fija el tipo en "gasto"', () => {
    // Una categoría solo existe para un gasto (ver construirDatosMovimiento.js)
    // -- "+ Nuevo gasto" desde DetalleCategoria.jsx entra ya sabiendo el tipo,
    // así que el paso 'tipo' también se salta (ver flujos.js).
    const estado = estadoInicialAsistente({ categoriaPreseleccionadaId: 'cat1' })
    expect(estado.categoriaId).toBe('cat1')
    expect(estado.categoriaPreseleccionadaId).toBe('cat1')
    expect(estado.tipo).toBe('gasto')
    expect(estado.tipoPreseleccionado).toBe(true)
  })

  it('con cuentaPreseleccionadaId y categoriaPreseleccionadaId juntas, precarga ambas y fija el tipo', () => {
    const estado = estadoInicialAsistente({ cuentaPreseleccionadaId: 'c1', categoriaPreseleccionadaId: 'cat1' })
    expect(estado.cuentaId).toBe('c1')
    expect(estado.categoriaId).toBe('cat1')
    expect(estado.tipo).toBe('gasto')
    expect(estado.tipoPreseleccionado).toBe(true)
  })
})

describe('reductorAsistente', () => {
  it('ELEGIR_TIPO fija el tipo, limpia lo que no aplica y avanza al paso 1', () => {
    const estado = {
      ...estadoInicialAsistente(),
      tipo: 'gasto',
      origen: 'tarjeta',
      tarjetaId: 't1',
      monto: '100',
      descripcion: 'algo',
      indicePaso: 3,
    }
    const nuevo = reductorAsistente(estado, { tipo: 'ELEGIR_TIPO', valor: 'ingreso' })
    expect(nuevo.tipo).toBe('ingreso')
    expect(nuevo.origen).toBe('cuenta')
    expect(nuevo.tarjetaId).toBe('')
    expect(nuevo.monto).toBe('')
    expect(nuevo.descripcion).toBe('')
    expect(nuevo.indicePaso).toBe(1)
  })

  it('ELEGIR_TIPO conserva las preselecciones y las vuelve a aplicar a cuentaId/categoriaId', () => {
    const estado = estadoInicialAsistente({ cuentaPreseleccionadaId: 'c1', categoriaPreseleccionadaId: 'cat1' })
    const nuevo = reductorAsistente(estado, { tipo: 'ELEGIR_TIPO', valor: 'gasto' })
    expect(nuevo.cuentaId).toBe('c1')
    expect(nuevo.categoriaId).toBe('cat1')
  })

  it('ELEGIR_TIPO usa las sugerencias (última cuenta/categoría usada) cuando no hay preselección', () => {
    const estado = estadoInicialAsistente()
    const nuevo = reductorAsistente(estado, {
      tipo: 'ELEGIR_TIPO',
      valor: 'gasto',
      sugerencias: { cuentaId: 'c9', categoriaId: 'cat9' },
    })
    expect(nuevo.cuentaId).toBe('c9')
    expect(nuevo.categoriaId).toBe('cat9')
  })

  it('ELEGIR_TIPO prioriza la preselección explícita sobre la sugerencia por historial', () => {
    const estado = estadoInicialAsistente({ cuentaPreseleccionadaId: 'c1' })
    const nuevo = reductorAsistente(estado, {
      tipo: 'ELEGIR_TIPO',
      valor: 'gasto',
      sugerencias: { cuentaId: 'c9' },
    })
    expect(nuevo.cuentaId).toBe('c1')
  })

  it('PARCHAR fusiona los cambios y avanza un paso', () => {
    const estado = { ...estadoInicialAsistente(), tipo: 'gasto', indicePaso: 1 }
    const nuevo = reductorAsistente(estado, { tipo: 'PARCHAR', cambios: { cuentaId: 'c2' } })
    expect(nuevo.cuentaId).toBe('c2')
    expect(nuevo.indicePaso).toBe(2)
  })

  it('ACTUALIZAR fusiona los cambios SIN avanzar de paso (BUG 1: el concepto se teclea, no se elige)', () => {
    const estado = { ...estadoInicialAsistente(), tipo: 'gasto', indicePaso: 3, descripcion: 'Cin' }
    const nuevo = reductorAsistente(estado, { tipo: 'ACTUALIZAR', cambios: { descripcion: 'Cine' } })
    expect(nuevo.descripcion).toBe('Cine')
    expect(nuevo.indicePaso).toBe(3)
  })

  it('RETROCEDER resta un paso sin bajar de 0', () => {
    const enPaso2 = reductorAsistente({ ...estadoInicialAsistente(), indicePaso: 2 }, { tipo: 'RETROCEDER' })
    expect(enPaso2.indicePaso).toBe(1)

    const enPaso0 = reductorAsistente({ ...estadoInicialAsistente(), indicePaso: 0 }, { tipo: 'RETROCEDER' })
    expect(enPaso0.indicePaso).toBe(0)
  })

  it('IR_A_PASO salta directo a un índice sin tocar el resto del borrador', () => {
    const estado = { ...estadoInicialAsistente(), tipo: 'gasto', indicePaso: 3 }
    const nuevo = reductorAsistente(estado, { tipo: 'IR_A_PASO', indice: 1 })
    expect(nuevo.indicePaso).toBe(1)
    expect(nuevo.tipo).toBe('gasto')
  })

  it('REINICIAR vuelve al estado inicial con las preselecciones dadas', () => {
    const estado = { ...estadoInicialAsistente(), tipo: 'traslado', monto: '500', indicePaso: 4 }
    const nuevo = reductorAsistente(estado, {
      tipo: 'REINICIAR',
      preselecciones: { cuentaPreseleccionadaId: 'c1' },
    })
    expect(nuevo).toEqual(estadoInicialAsistente({ cuentaPreseleccionadaId: 'c1' }))
  })
})
