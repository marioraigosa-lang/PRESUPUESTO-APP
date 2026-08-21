import { describe, expect, it } from 'vitest'
import { tieneConsentimientoVigente, todosLosConsentimientosAceptados } from './consentimientos'

describe('todosLosConsentimientosAceptados', () => {
  it('true solo cuando los 3 consentimientos están aceptados', () => {
    expect(
      todosLosConsentimientosAceptados({ aceptoDatos: true, aceptoTerminos: true, mayorEdad: true }),
    ).toBe(true)
  })

  it('false si falta la política de datos', () => {
    expect(
      todosLosConsentimientosAceptados({ aceptoDatos: false, aceptoTerminos: true, mayorEdad: true }),
    ).toBe(false)
  })

  it('false si faltan los términos', () => {
    expect(
      todosLosConsentimientosAceptados({ aceptoDatos: true, aceptoTerminos: false, mayorEdad: true }),
    ).toBe(false)
  })

  it('false si falta declarar mayoría de edad', () => {
    expect(
      todosLosConsentimientosAceptados({ aceptoDatos: true, aceptoTerminos: true, mayorEdad: false }),
    ).toBe(false)
  })

  it('false si ninguno está aceptado', () => {
    expect(
      todosLosConsentimientosAceptados({ aceptoDatos: false, aceptoTerminos: false, mayorEdad: false }),
    ).toBe(false)
  })
})

describe('tieneConsentimientoVigente', () => {
  const VERSIONES = { POLITICA_DATOS: '1.0', TERMINOS: '1.0', MAYOR_EDAD: '1.0' }

  it('false para un usuario sin ninguna fila (nunca aceptó nada)', () => {
    expect(tieneConsentimientoVigente([], VERSIONES)).toBe(false)
  })

  it('true cuando tiene las 3 filas en la versión vigente', () => {
    const filas = [
      { tipo: 'politica_datos', version: '1.0' },
      { tipo: 'terminos_uso', version: '1.0' },
      { tipo: 'mayor_edad', version: '1.0' },
    ]
    expect(tieneConsentimientoVigente(filas, VERSIONES)).toBe(true)
  })

  it('false si le falta un tipo por completo', () => {
    const filas = [
      { tipo: 'politica_datos', version: '1.0' },
      { tipo: 'mayor_edad', version: '1.0' },
    ]
    expect(tieneConsentimientoVigente(filas, VERSIONES)).toBe(false)
  })

  it('false si solo aceptó una versión anterior de un tipo', () => {
    const filas = [
      { tipo: 'politica_datos', version: '0.9' },
      { tipo: 'terminos_uso', version: '1.0' },
      { tipo: 'mayor_edad', version: '1.0' },
    ]
    expect(tieneConsentimientoVigente(filas, VERSIONES)).toBe(false)
  })

  it('true si tiene versiones viejas Y la vigente para el mismo tipo (historial append-only)', () => {
    const filas = [
      { tipo: 'politica_datos', version: '0.9' },
      { tipo: 'politica_datos', version: '1.0' },
      { tipo: 'terminos_uso', version: '1.0' },
      { tipo: 'mayor_edad', version: '1.0' },
    ]
    expect(tieneConsentimientoVigente(filas, VERSIONES)).toBe(true)
  })

  it('ignora filas de tipos desconocidos sin afectar el resultado', () => {
    const filas = [
      { tipo: 'politica_datos', version: '1.0' },
      { tipo: 'terminos_uso', version: '1.0' },
      { tipo: 'mayor_edad', version: '1.0' },
      { tipo: 'algo_futuro', version: '1.0' },
    ]
    expect(tieneConsentimientoVigente(filas, VERSIONES)).toBe(true)
  })
})
