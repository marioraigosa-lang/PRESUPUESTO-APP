import { describe, expect, it } from 'vitest'
import { construirConsultaMovimientosPeriodo } from './consultaMovimientosPeriodo'

// Imita el "query builder" encadenable de Supabase (mismo patrón que
// services/movimientos.test.js), pero además registra cada llamada
// (método + argumentos) en `llamadas` para poder verificar EXACTAMENTE
// qué filtros se encadenaron y en qué orden, ya que acá lo que importa no
// es un resultado sino la construcción de la consulta en sí.
function crearConstructorEspia() {
  const llamadas = []
  const builder = {}
  ;['gte', 'lte', 'or', 'eq', 'order', 'limit'].forEach((metodo) => {
    builder[metodo] = (...args) => {
      llamadas.push([metodo, ...args])
      return builder
    }
  })
  return { builder, llamadas }
}

describe('construirConsultaMovimientosPeriodo', () => {
  it('sin cuentaId ni categoriaId ni limite: filtra por fecha y ordena, sin or()/eq()/limit()', () => {
    const { builder, llamadas } = crearConstructorEspia()

    construirConsultaMovimientosPeriodo(builder, { desde: '2026-01-01', hasta: '2026-01-31' })

    expect(llamadas).toEqual([
      ['gte', 'fecha', '2026-01-01'],
      ['lte', 'fecha', '2026-01-31'],
      ['order', 'fecha', { ascending: false }],
      ['order', 'creado_en', { ascending: false }],
    ])
  })

  it('con cuentaId: agrega or() para traer la cuenta como origen O como destino', () => {
    const { builder, llamadas } = crearConstructorEspia()

    construirConsultaMovimientosPeriodo(builder, { desde: '2026-01-01', hasta: '2026-01-31', cuentaId: 7 })

    expect(llamadas).toContainEqual(['or', 'cuenta_id.eq.7,cuenta_destino_id.eq.7'])
  })

  it('con categoriaId: agrega eq() sobre categoria_id', () => {
    const { builder, llamadas } = crearConstructorEspia()

    construirConsultaMovimientosPeriodo(builder, {
      desde: '2026-01-01',
      hasta: '2026-01-31',
      categoriaId: 'cat-5',
    })

    expect(llamadas).toContainEqual(['eq', 'categoria_id', 'cat-5'])
  })

  it('con limite: agrega limit() al final, después de ordenar', () => {
    const { builder, llamadas } = crearConstructorEspia()

    construirConsultaMovimientosPeriodo(builder, { desde: '2026-01-01', hasta: '2026-01-31', limite: 5 })

    expect(llamadas[llamadas.length - 1]).toEqual(['limit', 5])
  })

  it('sin limite: no agrega limit()', () => {
    const { builder, llamadas } = crearConstructorEspia()

    construirConsultaMovimientosPeriodo(builder, { desde: '2026-01-01', hasta: '2026-01-31' })

    expect(llamadas.some(([metodo]) => metodo === 'limit')).toBe(false)
  })

  it('con cuentaId, categoriaId y limite juntos: aplica los tres filtros en el orden esperado', () => {
    const { builder, llamadas } = crearConstructorEspia()

    construirConsultaMovimientosPeriodo(builder, {
      desde: '2026-02-01',
      hasta: '2026-02-28',
      cuentaId: 1,
      categoriaId: 'cat-1',
      limite: 10,
    })

    expect(llamadas).toEqual([
      ['gte', 'fecha', '2026-02-01'],
      ['lte', 'fecha', '2026-02-28'],
      ['or', 'cuenta_id.eq.1,cuenta_destino_id.eq.1'],
      ['eq', 'categoria_id', 'cat-1'],
      ['order', 'fecha', { ascending: false }],
      ['order', 'creado_en', { ascending: false }],
      ['limit', 10],
    ])
  })

  it('devuelve el resultado final del builder (para que el llamador pueda hacer await)', () => {
    const { builder } = crearConstructorEspia()

    const resultado = construirConsultaMovimientosPeriodo(builder, { desde: '2026-01-01', hasta: '2026-01-31' })

    expect(resultado).toBe(builder)
  })
})
