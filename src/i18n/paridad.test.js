import { describe, expect, it } from 'vitest'
import es from './es'
import en from './en'

// Recorre un diccionario y devuelve el conjunto de rutas con punto de todas
// sus hojas ('perfil.titulo', 'actualizacion.actualizar', ...). Los arrays
// (ej. comun.meses) cuentan como una sola hoja: cada idioma decide su
// contenido, lo que importa es que la clave exista en ambos.
function rutas(objeto, prefijo = '') {
  const acumulado = []
  for (const [clave, valor] of Object.entries(objeto)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      acumulado.push(...rutas(valor, ruta))
    } else {
      acumulado.push(ruta)
    }
  }
  return acumulado.sort()
}

describe('paridad de claves i18n', () => {
  const clavesEs = rutas(es)
  const clavesEn = rutas(en)

  it('en.js tiene exactamente las mismas claves que es.js', () => {
    const faltanEnEn = clavesEs.filter((clave) => !clavesEn.includes(clave))
    const sobranEnEn = clavesEn.filter((clave) => !clavesEs.includes(clave))

    expect({ faltanEnEn, sobranEnEn }).toEqual({ faltanEnEn: [], sobranEnEn: [] })
  })
})
