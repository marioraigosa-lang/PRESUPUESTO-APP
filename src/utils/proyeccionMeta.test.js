import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generarRecomendacionMeta } from './proyeccionMeta'

// La función usa `new Date()` internamente para saber "hoy". Para que las
// pruebas den el mismo resultado sin importar el día en que se ejecuten,
// fijamos la fecha del sistema a un valor conocido: 15 de enero de 2026.
const HOY = new Date(2026, 0, 15)

// `formatear` en la app de verdad viene de useFormatoMoneda() (formatea con
// el símbolo de la moneda activa). Aquí usamos una versión simple que solo
// antepone "$", así los mensajes son fáciles de leer y las pruebas no
// dependen del formato de moneda (eso ya se prueba aparte en formatoMoneda.test.js).
const formatear = (valor) => `$${valor}`

describe('generarRecomendacionMeta', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(HOY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('escenario "vas sobrado": la proyección supera la meta con holgura (>= 110%)', () => {
    // 6 meses por delante, ahorrando 500.000/mes desde 1.000.000: se
    // proyectan 4.000.000 contra una meta de 3.000.000 -> 133% de la meta.
    const resultado = generarRecomendacionMeta({
      ahorroActual: 1000000,
      capacidadAhorroMensual: 500000,
      fechaObjetivo: '2026-07-15',
      montoObjetivo: 3000000,
      formatear,
    })

    expect(resultado.tono).toBe('positivo')
    expect(resultado.mensaje).toContain('sobrado')
    expect(resultado.mensaje).toContain('julio 2026')
  })

  it('escenario "justo alcanza": la proyección llega exactamente al 100% de la meta', () => {
    // 10 meses por delante, ahorrando 200.000/mes desde 0: se proyectan
    // 2.000.000, justo el monto objetivo -> 100% (frontera entre "aviso" y
    // "vas en camino": debe caer en "vas en camino", no en "sobrado").
    const resultado = generarRecomendacionMeta({
      ahorroActual: 0,
      capacidadAhorroMensual: 200000,
      fechaObjetivo: '2026-11-15',
      montoObjetivo: 2000000,
      formatear,
    })

    expect(resultado.tono).toBe('positivo')
    expect(resultado.mensaje).toContain('Vas en camino')
    expect(resultado.mensaje).toContain('$200000')
    expect(resultado.mensaje).toContain('noviembre 2026')
  })

  it('escenario "no alcanza": la proyección queda por debajo de la meta', () => {
    // 3 meses por delante, ahorrando 50.000/mes desde 100.000: se proyectan
    // 250.000 contra una meta de 1.000.000 -> 25%, muy por debajo.
    // Verificamos los 3 números clave que el mensaje debe calcular:
    // cuánto faltaría, cuánto habría que ahorrar al mes, y cuánto recortar.
    const resultado = generarRecomendacionMeta({
      ahorroActual: 100000,
      capacidadAhorroMensual: 50000,
      fechaObjetivo: '2026-04-15',
      montoObjetivo: 1000000,
      formatear,
    })

    expect(resultado.tono).toBe('aviso')
    expect(resultado.mensaje).toContain('$250000') // proyección
    expect(resultado.mensaje).toContain('$750000') // lo que faltaría (1.000.000 - 250.000)
    expect(resultado.mensaje).toContain('$300000') // necesario al mes ((1.000.000-100.000)/3)
    expect(resultado.mensaje).toContain('$250000') // recorte necesario (300.000 - 50.000)
  })

  it('escenario "capacidad de ahorro negativa": los gastos superan los ingresos', () => {
    // Con capacidadAhorroMensual negativa, el ahorro no crece nunca, sin
    // importar cuánto falte para la fecha objetivo.
    const resultado = generarRecomendacionMeta({
      ahorroActual: 500000,
      capacidadAhorroMensual: -100000,
      fechaObjetivo: '2026-06-15',
      montoObjetivo: 1000000,
      formatear,
    })

    expect(resultado.tono).toBe('alerta')
    expect(resultado.mensaje).toContain('gastos superan')
    expect(resultado.mensaje).toContain('$100000')
  })

  it('escenario "fecha objetivo ya pasó"', () => {
    const resultado = generarRecomendacionMeta({
      ahorroActual: 0,
      capacidadAhorroMensual: 100000,
      fechaObjetivo: '2025-12-01',
      montoObjetivo: 500000,
      formatear,
    })

    expect(resultado.tono).toBe('alerta')
    expect(resultado.mensaje).toContain('ya pasó')
    expect(resultado.mensaje).toContain('diciembre 2025')
  })

  it('caso límite: el día de la meta ya pasó este mes -> 0 meses restantes (sin división entre cero)', () => {
    // "Hoy" es 15 de enero de 2026. La fecha objetivo es 10 de febrero de
    // 2026: en meses "redondos" son 0 meses completos todavía (el día 10
    // de febrero es ANTES del día 15, así que ese mes no cuenta como
    // completo). mesesRestantes debe quedar en 0, y la función debe evitar
    // dividir entre cero al calcular "necesarioMensual".
    const resultado = generarRecomendacionMeta({
      ahorroActual: 200000,
      capacidadAhorroMensual: 100000,
      fechaObjetivo: '2026-02-10',
      montoObjetivo: 500000,
      formatear,
    })

    // Con 0 meses restantes, la proyección es igual al ahorro actual (no se
    // suma nada más), así que "faltaría" = 500.000 - 200.000 = 300.000, y
    // como no hay meses para prorratear, "necesario al mes" también da
    // 300.000 (monto que falta, de una sola vez).
    expect(resultado.tono).toBe('aviso')
    expect(resultado.mensaje).toContain('$300000')
  })
})
