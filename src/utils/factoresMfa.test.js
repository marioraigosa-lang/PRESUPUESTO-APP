import { describe, expect, it } from 'vitest'
import { siguienteNombreFactor, etiquetaFactor } from './factoresMfa'

const t = (clave, valores) => (valores ? `${clave}:${JSON.stringify(valores)}` : clave)

describe('siguienteNombreFactor', () => {
  it('devuelve "principal" cuando no hay factores', () => {
    expect(siguienteNombreFactor([])).toBe('principal')
  })

  it('devuelve "respaldo" cuando ya existe el principal', () => {
    expect(siguienteNombreFactor([{ friendly_name: 'principal' }])).toBe('respaldo')
  })

  it('numera el siguiente respaldo si "respaldo" ya está en uso', () => {
    expect(
      siguienteNombreFactor([{ friendly_name: 'principal' }, { friendly_name: 'respaldo' }]),
    ).toBe('respaldo-2')
  })

  it('salta números ya usados', () => {
    expect(
      siguienteNombreFactor([
        { friendly_name: 'principal' },
        { friendly_name: 'respaldo' },
        { friendly_name: 'respaldo-2' },
      ]),
    ).toBe('respaldo-3')
  })
})

describe('etiquetaFactor', () => {
  it('traduce "principal"', () => {
    expect(etiquetaFactor({ friendly_name: 'principal' }, t)).toBe('seguridad.factorPrincipal')
  })

  it('traduce "respaldo"', () => {
    expect(etiquetaFactor({ friendly_name: 'respaldo' }, t)).toBe('seguridad.factorRespaldo')
  })

  it('traduce "respaldo-N" con el número interpolado', () => {
    expect(etiquetaFactor({ friendly_name: 'respaldo-3' }, t)).toBe(
      'seguridad.factorRespaldoNumerado:{"numero":"3"}',
    )
  })

  it('devuelve el nombre tal cual si no reconoce el patrón', () => {
    expect(etiquetaFactor({ friendly_name: 'otro-cliente' }, t)).toBe('otro-cliente')
  })
})
