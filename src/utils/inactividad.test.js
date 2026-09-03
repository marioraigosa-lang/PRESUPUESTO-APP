import { describe, expect, it } from 'vitest'
import { LIMITE_INACTIVIDAD_MS, sesionExpiroPorInactividad } from './inactividad'

describe('sesionExpiroPorInactividad', () => {
  it('LIMITE_INACTIVIDAD_MS es 1 hora en milisegundos', () => {
    expect(LIMITE_INACTIVIDAD_MS).toBe(60 * 60 * 1000)
  })

  it('actividad reciente: no expiró', () => {
    const ahora = 1_000_000
    expect(sesionExpiroPorInactividad(ahora - 1000, ahora, LIMITE_INACTIVIDAD_MS)).toBe(false)
  })

  // Caso puntual del bug de cierre-en-círculo (ver diagnóstico en el chat):
  // un login nuevo escribe la marca de actividad con Date.now() y, un
  // instante después, useCierreInactividad.js revalida contra esa MISMA
  // marca al montar su efecto -- la diferencia es ~0ms, así que nunca debe
  // dar "expiró". Si esto alguna vez diera true, un login nuevo volvería a
  // cerrar la sesión de inmediato.
  it('marca recién escrita en este mismo instante (login que acaba de resetear el reloj): no expiró', () => {
    const ahora = 1_000_000
    expect(sesionExpiroPorInactividad(ahora, ahora, LIMITE_INACTIVIDAD_MS)).toBe(false)
  })

  it('un instante antes del límite: todavía no expiró', () => {
    const ahora = 1_000_000
    expect(sesionExpiroPorInactividad(ahora - LIMITE_INACTIVIDAD_MS + 1, ahora, LIMITE_INACTIVIDAD_MS)).toBe(
      false,
    )
  })

  it('justo en el límite: ya expiró', () => {
    const ahora = 1_000_000
    expect(sesionExpiroPorInactividad(ahora - LIMITE_INACTIVIDAD_MS, ahora, LIMITE_INACTIVIDAD_MS)).toBe(true)
  })

  it('muy pasado el límite: expiró', () => {
    const ahora = 1_000_000
    expect(sesionExpiroPorInactividad(ahora - LIMITE_INACTIVIDAD_MS * 3, ahora, LIMITE_INACTIVIDAD_MS)).toBe(
      true,
    )
  })

  it('ultimaActividad null (sin marca todavía): no expiró', () => {
    expect(sesionExpiroPorInactividad(null, Date.now(), LIMITE_INACTIVIDAD_MS)).toBe(false)
  })

  it('ultimaActividad undefined (sin marca todavía): no expiró', () => {
    expect(sesionExpiroPorInactividad(undefined, Date.now(), LIMITE_INACTIVIDAD_MS)).toBe(false)
  })

  it('ultimaActividad no numérico (dato corrupto en localStorage): no expiró', () => {
    expect(sesionExpiroPorInactividad('no-es-un-numero', Date.now(), LIMITE_INACTIVIDAD_MS)).toBe(false)
  })

  it('ultimaActividad como string numérico (tal como sale de localStorage): funciona igual', () => {
    const ahora = 1_000_000
    expect(
      sesionExpiroPorInactividad(String(ahora - LIMITE_INACTIVIDAD_MS * 2), ahora, LIMITE_INACTIVIDAD_MS),
    ).toBe(true)
  })

  it('usa LIMITE_INACTIVIDAD_MS por defecto si no se pasa límite', () => {
    const ahora = Date.now()
    expect(sesionExpiroPorInactividad(ahora - LIMITE_INACTIVIDAD_MS - 1, ahora)).toBe(true)
  })
})
