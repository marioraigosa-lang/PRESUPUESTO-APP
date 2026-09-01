import { describe, expect, it } from 'vitest'
import { esEntradaEnCuenta, calcularResumenCuenta, descripcionEnContexto } from './movimientosCuenta'

const CUENTA_A = 'cuenta-a'
const CUENTA_B = 'cuenta-b'

describe('esEntradaEnCuenta', () => {
  it('un ingreso siempre entra a la cuenta', () => {
    const movimiento = { tipo: 'ingreso', cuenta_destino_id: null }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(true)
  })

  it('un gasto siempre sale de la cuenta', () => {
    const movimiento = { tipo: 'gasto', cuenta_destino_id: null }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(false)
  })

  it('un traslado entra cuando esta cuenta es el destino', () => {
    const movimiento = { tipo: 'traslado', cuenta_destino_id: CUENTA_A }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(true)
  })

  it('un traslado sale cuando esta cuenta es el origen (no el destino)', () => {
    const movimiento = { tipo: 'traslado', cuenta_destino_id: CUENTA_B }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(false)
  })

  it('caso borde: tipo desconocido/sin definir se trata como salida, igual que un traslado que no es el destino', () => {
    const movimiento = { tipo: 'otro', cuenta_destino_id: null }

    expect(esEntradaEnCuenta(movimiento, CUENTA_A)).toBe(false)
  })
})

describe('calcularResumenCuenta', () => {
  it('suma un ingreso a totalIngresos y lo incluye en la lista', () => {
    const movimientos = [{ id: 1, tipo: 'ingreso', monto: 100000 }]

    const resultado = calcularResumenCuenta(movimientos, CUENTA_A)

    expect(resultado.totalIngresos).toBe(100000)
    expect(resultado.totalEgresos).toBe(0)
    expect(resultado.neto).toBe(100000)
    expect(resultado.listaMovimientos).toEqual(movimientos)
  })

  it('suma un gasto a totalEgresos pero lo excluye de la lista', () => {
    const movimientos = [{ id: 1, tipo: 'gasto', monto: 40000 }]

    const resultado = calcularResumenCuenta(movimientos, CUENTA_A)

    expect(resultado.totalIngresos).toBe(0)
    expect(resultado.totalEgresos).toBe(40000)
    expect(resultado.neto).toBe(-40000)
    expect(resultado.listaMovimientos).toEqual([])
  })

  it('un traslado de entrada (esta cuenta es el destino) suma a ingresos y aparece en la lista', () => {
    const movimiento = { id: 1, tipo: 'traslado', monto: 50000, cuenta_destino_id: CUENTA_A }

    const resultado = calcularResumenCuenta([movimiento], CUENTA_A)

    expect(resultado.totalIngresos).toBe(50000)
    expect(resultado.totalEgresos).toBe(0)
    expect(resultado.listaMovimientos).toEqual([movimiento])
  })

  it('un traslado de salida (esta cuenta es el origen) suma a egresos y también aparece en la lista', () => {
    const movimiento = { id: 1, tipo: 'traslado', monto: 50000, cuenta_destino_id: CUENTA_B }

    const resultado = calcularResumenCuenta([movimiento], CUENTA_A)

    expect(resultado.totalIngresos).toBe(0)
    expect(resultado.totalEgresos).toBe(50000)
    expect(resultado.listaMovimientos).toEqual([movimiento])
  })

  it('mezcla ingresos, gastos y traslados (en ambas direcciones) en un solo periodo', () => {
    const ingreso = { id: 1, tipo: 'ingreso', monto: 200000 }
    const gasto = { id: 2, tipo: 'gasto', monto: 30000 }
    const trasladoEntrada = { id: 3, tipo: 'traslado', monto: 10000, cuenta_destino_id: CUENTA_A }
    const trasladoSalida = { id: 4, tipo: 'traslado', monto: 5000, cuenta_destino_id: CUENTA_B }

    const resultado = calcularResumenCuenta([ingreso, gasto, trasladoEntrada, trasladoSalida], CUENTA_A)

    expect(resultado.totalIngresos).toBe(210000) // ingreso + traslado de entrada
    expect(resultado.totalEgresos).toBe(35000) // gasto + traslado de salida
    expect(resultado.neto).toBe(175000)
    expect(resultado.listaMovimientos).toEqual([ingreso, trasladoEntrada, trasladoSalida]) // el gasto queda fuera
  })

  it('caso vacío: sin movimientos, todos los totales quedan en 0 y la lista vacía', () => {
    const resultado = calcularResumenCuenta([], CUENTA_A)

    expect(resultado).toEqual({ totalIngresos: 0, totalEgresos: 0, neto: 0, listaMovimientos: [] })
  })
})

// Movida desde components/Movimiento.test.js: descripcionEnContexto vivía en
// Movimiento.jsx, cuyo import arrastraba en cadena MonedaContext ->
// AuthContext -> lib/supabase.js (que construye un cliente real y lanza si
// faltan las variables de entorno de Supabase). Al vivir ahora en este util
// sin dependencias de React/Supabase, este test ya no depende del .env.
describe('descripcionEnContexto', () => {
  const cuentaContextoId = CUENTA_A

  // `t` falso: en vez de devolver un string traducido, devuelve un objeto
  // {clave, valores} para poder verificar exactamente qué clave y qué
  // parámetros habría usado la traducción real, sin depender de i18n.
  function tFalso(clave, valores) {
    return valores ? { clave, valores } : clave
  }

  it('traslado donde la cuenta de contexto es el ORIGEN: "Traslado a {destino}"', () => {
    const movimiento = {
      tipo: 'traslado',
      cuenta_id: CUENTA_A,
      cuentaDestino: 'Ahorros',
    }

    expect(descripcionEnContexto(movimiento, cuentaContextoId, tFalso)).toEqual({
      clave: 'cuentas.detalle.trasladoA',
      valores: { cuenta: 'Ahorros' },
    })
  })

  it('traslado donde la cuenta de contexto es el DESTINO: "Traslado desde {origen}"', () => {
    const movimiento = {
      tipo: 'traslado',
      cuenta_id: CUENTA_B, // el origen es OTRA cuenta, no la de contexto
      cuenta: 'Nómina',
    }

    expect(descripcionEnContexto(movimiento, cuentaContextoId, tFalso)).toEqual({
      clave: 'cuentas.detalle.trasladoDesde',
      valores: { cuenta: 'Nómina' },
    })
  })

  it('un ingreso (no es traslado) devuelve su descripción tal cual, sin tocar t()', () => {
    const movimiento = { tipo: 'ingreso', descripcion: 'Salario de agosto' }

    expect(descripcionEnContexto(movimiento, cuentaContextoId, tFalso)).toBe('Salario de agosto')
  })

  it('un gasto (no es traslado) devuelve su descripción tal cual', () => {
    const movimiento = { tipo: 'gasto', descripcion: 'Mercado' }

    expect(descripcionEnContexto(movimiento, cuentaContextoId, tFalso)).toBe('Mercado')
  })

  it('un traslado SIN cuentaContextoId (uso "desde afuera", ej. Home) devuelve la descripción tal cual', () => {
    const movimiento = {
      tipo: 'traslado',
      cuenta_id: CUENTA_A,
      cuentaDestino: 'Ahorros',
      descripcion: 'Cuenta A → Ahorros',
    }

    expect(descripcionEnContexto(movimiento, null, tFalso)).toBe('Cuenta A → Ahorros')
    expect(descripcionEnContexto(movimiento, undefined, tFalso)).toBe('Cuenta A → Ahorros')
  })

  it('origen visto desde sí mismo, pero la cuenta destino ya fue eliminada: usa el texto de respaldo', () => {
    const movimiento = {
      tipo: 'traslado',
      cuenta_id: CUENTA_A,
      cuentaDestino: null, // la cuenta destino fue borrada -- ver useMovimientosPeriodo
    }

    expect(descripcionEnContexto(movimiento, cuentaContextoId, tFalso)).toEqual({
      clave: 'cuentas.detalle.trasladoA',
      valores: { cuenta: 'home.cuentaEliminada' },
    })
  })

  it('destino visto desde sí mismo, pero la cuenta de origen ya fue eliminada: usa el texto de respaldo', () => {
    const movimiento = {
      tipo: 'traslado',
      cuenta_id: CUENTA_B,
      cuenta: null, // la cuenta de origen fue borrada
    }

    expect(descripcionEnContexto(movimiento, cuentaContextoId, tFalso)).toEqual({
      clave: 'cuentas.detalle.trasladoDesde',
      valores: { cuenta: 'home.cuentaEliminada' },
    })
  })
})
