import { describe, expect, it } from 'vitest'
import {
  GRUPOS_ICONOS,
  ICONOS,
  ICONO_FALLBACK,
  resolverIcono,
} from './catalogoIconos'

// Un componente de lucide-react es un objeto forwardRef. No se renderiza nada
// aqui (el entorno de test es 'node', sin DOM): basta con comprobar la forma.
function esComponenteIcono(valor) {
  return (
    valor != null &&
    typeof valor === 'object' &&
    valor.$$typeof === Symbol.for('react.forward_ref')
  )
}

// Las 12 claves de grupo del plan, en orden.
const CLAVES_GRUPO = [
  'comida',
  'transporte',
  'hogar',
  'servicios',
  'salud',
  'ocio',
  'compras',
  'finanzas',
  'trabajo_educacion',
  'personas_mascotas',
  'viajes',
  'otros',
]

describe('catalogoIconos', () => {
  it('tiene exactamente los 12 grupos del plan, en orden', () => {
    expect(GRUPOS_ICONOS.map((g) => g.clave)).toEqual(CLAVES_GRUPO)
  })

  it('ningun grupo esta vacio', () => {
    for (const grupo of GRUPOS_ICONOS) {
      expect(grupo.iconos.length, `grupo "${grupo.clave}"`).toBeGreaterThan(0)
    }
  })

  it('cada nombre listado en un grupo existe en ICONOS', () => {
    const faltantes = []
    for (const grupo of GRUPOS_ICONOS) {
      for (const nombre of grupo.iconos) {
        if (!(nombre in ICONOS)) faltantes.push(`${grupo.clave}/${nombre}`)
      }
    }
    expect(faltantes).toEqual([])
  })

  it('cada valor de ICONOS es un componente de icono valido', () => {
    const invalidos = Object.keys(ICONOS).filter((k) => !esComponenteIcono(ICONOS[k]))
    expect(invalidos).toEqual([])
  })

  it('no hay entradas en ICONOS que ningun grupo referencie', () => {
    const usados = new Set(GRUPOS_ICONOS.flatMap((g) => g.iconos))
    const huerfanos = Object.keys(ICONOS).filter((k) => !usados.has(k))
    expect(huerfanos).toEqual([])
  })

  it("el fallback 'tag' esta definido y presente en el catalogo", () => {
    expect(ICONO_FALLBACK).toBe('tag')
    expect(ICONOS.tag).toBeDefined()
    expect(esComponenteIcono(ICONOS.tag)).toBe(true)
  })

  it('el catalogo tiene un tamano razonable (>= 120 iconos, como pide el plan)', () => {
    expect(Object.keys(ICONOS).length).toBeGreaterThanOrEqual(120)
  })
})

describe('resolverIcono', () => {
  it('devuelve el componente correspondiente a un nombre del catalogo', () => {
    expect(resolverIcono('coffee')).toBe(ICONOS.coffee)
    expect(resolverIcono('shopping-cart')).toBe(ICONOS['shopping-cart'])
  })

  it("cae al icono 'tag' ante un nombre desconocido", () => {
    expect(resolverIcono('no-existe-este-icono')).toBe(ICONOS.tag)
    expect(resolverIcono(undefined)).toBe(ICONOS.tag)
    expect(resolverIcono('')).toBe(ICONOS.tag)
  })

  it('siempre devuelve un componente valido', () => {
    expect(esComponenteIcono(resolverIcono('cualquier-cosa'))).toBe(true)
  })
})
