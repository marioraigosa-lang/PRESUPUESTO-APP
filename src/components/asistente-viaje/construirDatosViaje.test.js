import { describe, expect, it } from 'vitest'
import { construirDatosViaje, categoriasElegidasDeViaje } from './construirDatosViaje'
import { estadoInicialViaje } from './reductorViaje'

const t = (clave, params) => {
  if (clave === 'viajes.asistente.nombrePorDefecto') return `Viaje a ${params.destino}`
  if (clave === 'viajes.asistente.nombrePorDefectoOrigen') return `Viaje desde ${params.origen}`
  if (clave === 'viajes.asistente.nombrePorDefectoGenerico') return 'Nuevo viaje'
  return clave
}

describe('construirDatosViaje', () => {
  it('con destino, deriva el nombre "Viaje a {destino}"', () => {
    const borrador = { ...estadoInicialViaje(), origen: 'Bogotá', destino: 'Cartagena' }
    const datos = construirDatosViaje(borrador, { t })
    expect(datos.nombre).toBe('Viaje a Cartagena')
    expect(datos.origen).toBe('Bogotá')
    expect(datos.destino).toBe('Cartagena')
  })

  it('sin destino pero con origen, deriva el nombre desde el origen', () => {
    const borrador = { ...estadoInicialViaje(), origen: 'Bogotá', destino: '' }
    const datos = construirDatosViaje(borrador, { t })
    expect(datos.nombre).toBe('Viaje desde Bogotá')
  })

  it('sin origen ni destino, usa el nombre genérico', () => {
    const borrador = estadoInicialViaje()
    const datos = construirDatosViaje(borrador, { t })
    expect(datos.nombre).toBe('Nuevo viaje')
  })

  it('recorta espacios de origen/destino', () => {
    const borrador = { ...estadoInicialViaje(), origen: '  Bogotá  ', destino: '  Cartagena  ' }
    const datos = construirDatosViaje(borrador, { t })
    expect(datos.origen).toBe('Bogotá')
    expect(datos.destino).toBe('Cartagena')
  })

  it('castea adultos/ninos a número, con 1/0 de respaldo si vinieran inválidos', () => {
    const borrador = { ...estadoInicialViaje(), adultos: '', ninos: '' }
    const datos = construirDatosViaje(borrador, { t })
    expect(datos.adultos).toBe(1)
    expect(datos.ninos).toBe(0)
  })

  it('deja las fechas en null si vienen vacías', () => {
    const borrador = estadoInicialViaje()
    const datos = construirDatosViaje(borrador, { t })
    expect(datos.fechaDesde).toBeNull()
    expect(datos.fechaHasta).toBeNull()
  })
})

describe('categoriasElegidasDeViaje', () => {
  it('solo incluye las categorías marcadas, con su presupuesto y la moneda compartida', () => {
    const borrador = {
      ...estadoInicialViaje(),
      monedaCategorias: 'USD',
      categorias: {
        ...estadoInicialViaje().categorias,
        hotel: { seleccionada: true, presupuesto: '500' },
        tiquetes: { seleccionada: true, presupuesto: '' },
        compras: { seleccionada: false, presupuesto: '999' },
      },
    }

    const seleccion = categoriasElegidasDeViaje(borrador)

    expect(seleccion).toContainEqual({ clave: 'hotel', presupuesto: 500, moneda: 'USD' })
    expect(seleccion).toContainEqual({ clave: 'tiquetes', presupuesto: 0, moneda: 'USD' })
    expect(seleccion.find((c) => c.clave === 'compras')).toBeUndefined()
  })

  it('con ninguna categoría marcada, devuelve un array vacío', () => {
    const borrador = {
      ...estadoInicialViaje(),
      categorias: Object.fromEntries(
        Object.keys(estadoInicialViaje().categorias).map((clave) => [clave, { seleccionada: false, presupuesto: '' }]),
      ),
    }
    expect(categoriasElegidasDeViaje(borrador)).toEqual([])
  })
})
