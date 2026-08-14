import { describe, expect, it } from 'vitest'
import { gastoMensualPromedio } from './gastoMensualPromedio'

describe('gastoMensualPromedio', () => {
  it('sin gastos -> 0, sin dividir por cero', () => {
    expect(gastoMensualPromedio([])).toBe(0)
  })

  it('un solo mes con actividad -> usa el gasto real de ese mes, sin promediar', () => {
    const gastos = [
      { monto: 100000, fecha: '2026-07-05' },
      { monto: 50000, fecha: '2026-07-20' },
    ]
    expect(gastoMensualPromedio(gastos)).toBe(150000)
  })

  it('dos meses con actividad -> promedia el total entre esos meses', () => {
    const gastos = [
      { monto: 100000, fecha: '2026-06-10' },
      { monto: 200000, fecha: '2026-07-10' },
    ]
    // total 300000 / 2 meses = 150000
    expect(gastoMensualPromedio(gastos)).toBe(150000)
  })

  it('tres meses con actividad, con varios gastos por mes -> promedia correctamente', () => {
    const gastos = [
      { monto: 100000, fecha: '2026-05-01' },
      { monto: 50000, fecha: '2026-05-15' },
      { monto: 300000, fecha: '2026-06-01' },
      { monto: 200000, fecha: '2026-07-01' },
    ]
    // mayo: 150000, junio: 300000, julio: 200000 -> total 650000 / 3 = 216666.67
    expect(gastoMensualPromedio(gastos)).toBeCloseTo(216666.6667, 2)
  })

  it('no cuenta meses sin gastos, solo los meses con actividad', () => {
    // Aunque hay un salto de varios meses sin gastos entre marzo y julio, solo
    // hay 2 meses CON actividad (marzo y julio), así que se promedia entre 2.
    const gastos = [
      { monto: 90000, fecha: '2026-03-10' },
      { monto: 210000, fecha: '2026-07-10' },
    ]
    expect(gastoMensualPromedio(gastos)).toBe(150000)
  })
})

// La función no distingue gastos de ingresos: solo agrupa "montos con
// fecha" por mes. Estas pruebas confirman que se comporta igual de bien
// reutilizada para calcular el ingreso mensual promedio (Emergencia.jsx).
describe('gastoMensualPromedio reutilizada para ingresos', () => {
  it('sin ingresos -> 0', () => {
    expect(gastoMensualPromedio([])).toBe(0)
  })

  it('ingresos en un solo mes -> usa ese mes tal cual', () => {
    const ingresos = [
      { monto: 2000000, fecha: '2026-07-01' },
      { monto: 300000, fecha: '2026-07-15' },
    ]
    expect(gastoMensualPromedio(ingresos)).toBe(2300000)
  })

  it('ingresos en varios meses -> promedia entre los meses con actividad', () => {
    const ingresos = [
      { monto: 2000000, fecha: '2026-05-01' },
      { monto: 2200000, fecha: '2026-06-01' },
      { monto: 2000000, fecha: '2026-07-01' },
    ]
    // total 6200000 / 3 meses = 2066666.67
    expect(gastoMensualPromedio(ingresos)).toBeCloseTo(2066666.6667, 2)
  })
})

// capacidadAhorroMensual (Emergencia.jsx) = ingresoMensualPromedio -
// gastoMensualPromedio, ambos calculados con la MISMA función sobre listas
// separadas de ingresos y gastos. Estas pruebas fijan ese contrato: los dos
// promedios deben poder tener distinta cantidad de "meses con actividad"
// (p. ej. gastos registrados en 1 mes pero ingresos en 3) y aun así
// combinarse en una cifra mensual coherente, sin NaN/Infinity.
describe('capacidad de ahorro mensual (ingresoMensualPromedio - gastoMensualPromedio)', () => {
  it('sin ingresos ni gastos -> 0 - 0 = 0', () => {
    const ingresoMensual = gastoMensualPromedio([])
    const gastoMensual = gastoMensualPromedio([])
    expect(ingresoMensual - gastoMensual).toBe(0)
  })

  it('un mes de ingresos y un mes de gastos -> diferencia directa de ese mes', () => {
    const ingresos = [{ monto: 2000000, fecha: '2026-07-01' }]
    const gastos = [{ monto: 1200000, fecha: '2026-07-15' }]
    const ingresoMensual = gastoMensualPromedio(ingresos)
    const gastoMensual = gastoMensualPromedio(gastos)
    expect(ingresoMensual - gastoMensual).toBe(800000)
  })

  it('ingresos en 3 meses pero gastos en 1 solo mes -> cada uno se promedia por separado', () => {
    // Este es justo el caso que antes se calculaba mal: sumar TODO el
    // historial de ingresos (3 meses) contra un gasto ya promediado (1 mes)
    // inflaba la capacidad de ahorro. Ahora cada lado usa su propio promedio.
    const ingresos = [
      { monto: 2000000, fecha: '2026-05-01' },
      { monto: 2000000, fecha: '2026-06-01' },
      { monto: 2000000, fecha: '2026-07-01' },
    ]
    const gastos = [{ monto: 1500000, fecha: '2026-07-10' }]
    const ingresoMensual = gastoMensualPromedio(ingresos)
    const gastoMensual = gastoMensualPromedio(gastos)
    expect(ingresoMensual).toBe(2000000)
    expect(gastoMensual).toBe(1500000)
    expect(ingresoMensual - gastoMensual).toBe(500000)
  })

  it('gastos mayores que ingresos -> capacidad de ahorro negativa, sin NaN/Infinity', () => {
    const ingresos = [{ monto: 1000000, fecha: '2026-07-01' }]
    const gastos = [{ monto: 1800000, fecha: '2026-07-20' }]
    const ingresoMensual = gastoMensualPromedio(ingresos)
    const gastoMensual = gastoMensualPromedio(gastos)
    const capacidad = ingresoMensual - gastoMensual
    expect(capacidad).toBe(-800000)
    expect(Number.isFinite(capacidad)).toBe(true)
  })

  it('sin ingresos pero con gastos -> capacidad negativa igual al gasto', () => {
    const gastos = [{ monto: 500000, fecha: '2026-07-01' }]
    const ingresoMensual = gastoMensualPromedio([])
    const gastoMensual = gastoMensualPromedio(gastos)
    expect(ingresoMensual - gastoMensual).toBe(-500000)
  })
})
