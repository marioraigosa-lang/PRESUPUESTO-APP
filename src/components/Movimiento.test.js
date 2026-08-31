import { describe, expect, it } from 'vitest'
import { descripcionEnContexto } from './Movimiento'

// NOTA de diagnóstico (no es parte del comportamiento a probar): importar
// este módulo arrastra, en cadena, MonedaContext -> AuthContext ->
// lib/supabase.js, que construye un cliente real de Supabase al cargarse y
// lanza un error si faltan VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY. Este
// test pasa hoy porque el .env local las tiene, pero es una dependencia
// "prestada" que descripcionEnContexto en sí misma no necesita -- si algún
// día se ejecuta en un entorno sin ese .env (CI, checkout nuevo), este
// archivo fallaría al importar aunque la función esté perfectamente sana.
// Se deja así, sin extraer, porque así se pidió para esta ronda de tests.
describe('descripcionEnContexto', () => {
  const cuentaContextoId = 'cuenta-a'

  // `t` falso: en vez de devolver un string traducido, devuelve un objeto
  // {clave, valores} para poder verificar exactamente qué clave y qué
  // parámetros habría usado la traducción real, sin depender de i18n.
  function tFalso(clave, valores) {
    return valores ? { clave, valores } : clave
  }

  it('traslado donde la cuenta de contexto es el ORIGEN: "Traslado a {destino}"', () => {
    const movimiento = {
      tipo: 'traslado',
      cuenta_id: 'cuenta-a',
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
      cuenta_id: 'cuenta-b', // el origen es OTRA cuenta, no la de contexto
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
      cuenta_id: 'cuenta-a',
      cuentaDestino: 'Ahorros',
      descripcion: 'Cuenta A → Ahorros',
    }

    expect(descripcionEnContexto(movimiento, null, tFalso)).toBe('Cuenta A → Ahorros')
    expect(descripcionEnContexto(movimiento, undefined, tFalso)).toBe('Cuenta A → Ahorros')
  })

  it('origen visto desde sí mismo, pero la cuenta destino ya fue eliminada: usa el texto de respaldo', () => {
    const movimiento = {
      tipo: 'traslado',
      cuenta_id: 'cuenta-a',
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
      cuenta_id: 'cuenta-b',
      cuenta: null, // la cuenta de origen fue borrada
    }

    expect(descripcionEnContexto(movimiento, cuentaContextoId, tFalso)).toEqual({
      clave: 'cuentas.detalle.trasladoDesde',
      valores: { cuenta: 'home.cuentaEliminada' },
    })
  })
})
