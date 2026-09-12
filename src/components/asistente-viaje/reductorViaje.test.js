import { describe, expect, it } from 'vitest'
import { estadoInicialViaje, reductorViaje } from './reductorViaje'
import { CATEGORIAS_POR_DEFECTO } from '../../services/categoriasViaje'

describe('estadoInicialViaje', () => {
  it('arranca vacío en el paso 0, con adultos=1, ninos=0 y moneda COP', () => {
    const estado = estadoInicialViaje()
    expect(estado.origen).toBe('')
    expect(estado.destino).toBe('')
    expect(estado.fechaDesde).toBe('')
    expect(estado.fechaHasta).toBe('')
    expect(estado.adultos).toBe('1')
    expect(estado.ninos).toBe('0')
    expect(estado.monedaCategorias).toBe('COP')
    expect(estado.indicePaso).toBe(0)
  })

  it('precarga las 8 categorías, con tiquetes/transporte/alimentacion/hotel marcadas por defecto', () => {
    const estado = estadoInicialViaje()
    expect(Object.keys(estado.categorias)).toHaveLength(CATEGORIAS_POR_DEFECTO.length)

    for (const { clave } of CATEGORIAS_POR_DEFECTO) {
      expect(estado.categorias[clave].presupuesto).toBe('')
    }

    expect(estado.categorias.tiquetes.seleccionada).toBe(true)
    expect(estado.categorias.transporte.seleccionada).toBe(true)
    expect(estado.categorias.alimentacion.seleccionada).toBe(true)
    expect(estado.categorias.hotel.seleccionada).toBe(true)
    expect(estado.categorias.actividades.seleccionada).toBe(false)
    expect(estado.categorias.compras.seleccionada).toBe(false)
    expect(estado.categorias.souvenirs.seleccionada).toBe(false)
    expect(estado.categorias.otros.seleccionada).toBe(false)
  })
})

describe('reductorViaje', () => {
  it('PARCHAR fusiona los cambios y avanza un paso', () => {
    const estado = { ...estadoInicialViaje(), indicePaso: 0 }
    const nuevo = reductorViaje(estado, { tipo: 'PARCHAR', cambios: { destino: 'Cartagena' } })
    expect(nuevo.destino).toBe('Cartagena')
    expect(nuevo.indicePaso).toBe(1)
  })

  it('ACTUALIZAR fusiona los cambios SIN avanzar de paso', () => {
    const estado = { ...estadoInicialViaje(), indicePaso: 1, origen: 'Bogot' }
    const nuevo = reductorViaje(estado, { tipo: 'ACTUALIZAR', cambios: { origen: 'Bogotá' } })
    expect(nuevo.origen).toBe('Bogotá')
    expect(nuevo.indicePaso).toBe(1)
  })

  describe('ALTERNAR_CATEGORIA', () => {
    it('marca una categoría desmarcada', () => {
      const estado = estadoInicialViaje()
      const nuevo = reductorViaje(estado, { tipo: 'ALTERNAR_CATEGORIA', clave: 'compras' })
      expect(nuevo.categorias.compras.seleccionada).toBe(true)
    })

    it('al desmarcar una categoría marcada, limpia su presupuesto', () => {
      const conPresupuesto = {
        ...estadoInicialViaje(),
        categorias: {
          ...estadoInicialViaje().categorias,
          hotel: { seleccionada: true, presupuesto: '500000' },
        },
      }
      const nuevo = reductorViaje(conPresupuesto, { tipo: 'ALTERNAR_CATEGORIA', clave: 'hotel' })
      expect(nuevo.categorias.hotel.seleccionada).toBe(false)
      expect(nuevo.categorias.hotel.presupuesto).toBe('')
    })

    it('no toca el resto de las categorías', () => {
      const estado = estadoInicialViaje()
      const nuevo = reductorViaje(estado, { tipo: 'ALTERNAR_CATEGORIA', clave: 'hotel' })
      expect(nuevo.categorias.tiquetes).toEqual(estado.categorias.tiquetes)
    })
  })

  it('CAMBIAR_PRESUPUESTO_CATEGORIA actualiza solo el presupuesto de esa categoría', () => {
    const estado = estadoInicialViaje()
    const nuevo = reductorViaje(estado, {
      tipo: 'CAMBIAR_PRESUPUESTO_CATEGORIA',
      clave: 'hotel',
      presupuesto: '800000',
    })
    expect(nuevo.categorias.hotel.presupuesto).toBe('800000')
    expect(nuevo.categorias.hotel.seleccionada).toBe(estado.categorias.hotel.seleccionada)
    expect(nuevo.categorias.tiquetes).toEqual(estado.categorias.tiquetes)
  })

  describe('CAMBIAR_MONEDA_CATEGORIAS', () => {
    it('cambia la moneda compartida', () => {
      const estado = estadoInicialViaje()
      const nuevo = reductorViaje(estado, { tipo: 'CAMBIAR_MONEDA_CATEGORIAS', moneda: 'USD' })
      expect(nuevo.monedaCategorias).toBe('USD')
    })

    it('reinterpreta los presupuestos ya escritos con las reglas de la moneda nueva (mismo idioma que HojaNuevoGastoViaje.jsx -> manejarCambioMoneda)', () => {
      const estado = {
        ...estadoInicialViaje(),
        categorias: {
          ...estadoInicialViaje().categorias,
          hotel: { seleccionada: true, presupuesto: '500000' }, // COP, sin decimales
        },
      }
      const nuevo = reductorViaje(estado, { tipo: 'CAMBIAR_MONEDA_CATEGORIAS', moneda: 'USD' })
      // De COP (formatea "500.000", punto como separador de MILES) a USD
      // (interpreta ese mismo punto como separador DECIMAL, con solo 2
      // decimales) el valor cambia de magnitud -- mismo comportamiento ya
      // aceptado en HojaNuevoGastoViaje.jsx/PasoMontoGastoViaje.jsx: cambiar
      // de una moneda sin decimales a una con decimales, con un monto grande
      // ya escrito, requiere revisar el monto. No es nuevo de este reducer.
      expect(nuevo.categorias.hotel.presupuesto).toBe('500.00')
    })

    it('no toca un presupuesto vacío', () => {
      const estado = estadoInicialViaje()
      const nuevo = reductorViaje(estado, { tipo: 'CAMBIAR_MONEDA_CATEGORIAS', moneda: 'EUR' })
      expect(nuevo.categorias.hotel.presupuesto).toBe('')
    })
  })

  it('RETROCEDER resta un paso sin bajar de 0', () => {
    const enPaso1 = reductorViaje({ ...estadoInicialViaje(), indicePaso: 2 }, { tipo: 'RETROCEDER' })
    expect(enPaso1.indicePaso).toBe(1)

    const enPaso0 = reductorViaje({ ...estadoInicialViaje(), indicePaso: 0 }, { tipo: 'RETROCEDER' })
    expect(enPaso0.indicePaso).toBe(0)
  })

  it('IR_A_PASO salta directo a un índice sin tocar el resto del borrador', () => {
    const estado = { ...estadoInicialViaje(), destino: 'Cartagena', indicePaso: 3 }
    const nuevo = reductorViaje(estado, { tipo: 'IR_A_PASO', indice: 0 })
    expect(nuevo.indicePaso).toBe(0)
    expect(nuevo.destino).toBe('Cartagena')
  })

  it('REINICIAR vuelve al estado inicial', () => {
    const estado = { ...estadoInicialViaje(), destino: 'Cartagena', indicePaso: 3 }
    const nuevo = reductorViaje(estado, { tipo: 'REINICIAR' })
    expect(nuevo).toEqual(estadoInicialViaje())
  })
})
