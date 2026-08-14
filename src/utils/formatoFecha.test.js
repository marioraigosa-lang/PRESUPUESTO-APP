import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fechaCorta,
  fechaCortaDesdeISO,
  fechaLocalISO,
  fechaPagoEnPeriodo,
  mesAnioLargoDesdeISO,
  parsearFechaISO,
} from './formatoFecha'

describe('fechaLocalISO', () => {
  it('arma YYYY-MM-DD con ceros a la izquierda en mes y día', () => {
    // 5 de enero: mes 0 en JS Date -> debe verse como "01", día "05".
    expect(fechaLocalISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('funciona igual para el último mes y último día del año', () => {
    expect(fechaLocalISO(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('usa la fecha de HOY si no se le pasa ninguna fecha', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 3)) // 3 de junio de 2026
    expect(fechaLocalISO()).toBe('2026-06-03')
    vi.useRealTimers()
  })
})

describe('parsearFechaISO', () => {
  it('convierte "YYYY-MM-DD" en una fecha LOCAL (no UTC)', () => {
    const fecha = parsearFechaISO('2026-03-20')
    expect(fecha.getFullYear()).toBe(2026)
    expect(fecha.getMonth()).toBe(2) // marzo = índice 2
    expect(fecha.getDate()).toBe(20)
  })
})

describe('fechaCorta / fechaCortaDesdeISO', () => {
  it('devuelve "día + mes abreviado" en español por defecto', () => {
    expect(fechaCorta(new Date(2026, 6, 4))).toBe('4 jul')
  })

  it('devuelve "día + mes abreviado" en inglés si se pasa idioma "en"', () => {
    expect(fechaCorta(new Date(2026, 6, 4), 'en')).toBe('4 jul')
  })

  it('a partir de un ISO de Supabase (con hora), da el mismo resultado que a partir del Date equivalente', () => {
    // Simula lo que llega de Supabase para una columna timestamp: incluye
    // hora y offset UTC. La función debe leer solo los primeros 10
    // caracteres (YYYY-MM-DD) y no dejarse correr el día por el offset UTC.
    expect(fechaCortaDesdeISO('2026-09-01T23:45:00.000Z')).toBe('1 sep')
  })
})

describe('mesAnioLargoDesdeISO', () => {
  it('en español: nombre completo del mes en minúscula + año', () => {
    expect(mesAnioLargoDesdeISO('2026-07-15')).toBe('julio 2026')
  })

  it('en inglés: nombre completo del mes en minúscula + año', () => {
    expect(mesAnioLargoDesdeISO('2026-07-15', 'en')).toBe('july 2026')
  })
})

describe('fechaPagoEnPeriodo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15)) // "hoy" = 15 de marzo de 2026
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('si el período elegido es el MES ACTUAL, usa la fecha de HOY (ignora el día de pago)', () => {
    // Aunque el gasto se pague normalmente el día 5, si estamos viendo el
    // mes actual el pago se registra HOY (15 de marzo), no el día 5.
    expect(fechaPagoEnPeriodo(2026, 2, 5)).toBe('2026-03-15')
  })

  it('si el período es OTRO mes, usa el día de pago dentro de ese mes', () => {
    expect(fechaPagoEnPeriodo(2026, 4, 20)).toBe('2026-05-20') // mayo, día 20
  })

  it('si el día de pago no existe en ese mes (ej. 31 en febrero), lo recorta al último día del mes', () => {
    // Febrero de 2026 tiene 28 días (no es bisiesto).
    expect(fechaPagoEnPeriodo(2026, 1, 31)).toBe('2026-02-28')
  })

  it('si no hay día de pago definido (0/null), usa el día 1 del mes elegido', () => {
    expect(fechaPagoEnPeriodo(2026, 5, null)).toBe('2026-06-01')
    expect(fechaPagoEnPeriodo(2026, 5, 0)).toBe('2026-06-01')
  })
})
