import { describe, expect, it } from 'vitest'
import { mensajeFondo } from './mensajeFondo'

// mensajeFondo NO devuelve el texto final, devuelve una CLAVE de traducción
// + un "tono" (color/estilo) + los VALORES a interpolar (siempre incluye el
// número real de meses cubiertos, nunca un mensaje genérico). Acá se
// verifica que la clave/tono/valores correctos se elijan según los meses
// cubiertos Y la meta propia del usuario, incluyendo las fronteras exactas
// (1 mes, la meta, y 12 meses), que es donde más fácil se cuela un error de
// "menor que" vs "menor o igual que".
describe('mensajeFondo', () => {
  it('menos de 1 mes cubierto -> alerta urgente, con el número real', () => {
    expect(mensajeFondo(0, 6)).toEqual({
      clave: 'emergencia.mensajeConstruyendoUrgente',
      tono: 'alerta',
      valores: { meses: 0 },
    })
    expect(mensajeFondo(0.5, 6)).toEqual({
      clave: 'emergencia.mensajeConstruyendoUrgente',
      tono: 'alerta',
      valores: { meses: 0.5 },
    })
  })

  it('menos de 1 mes gana incluso con una meta baja (1 mes)', () => {
    expect(mensajeFondo(0.5, 1)).toEqual({
      clave: 'emergencia.mensajeConstruyendoUrgente',
      tono: 'alerta',
      valores: { meses: 0.5 },
    })
  })

  it('frontera: exactamente 1 mes ya no es "menos de 1 mes"', () => {
    // Con meta 6, 1 mes sigue por debajo de la meta -> tramo "construyendo".
    expect(mensajeFondo(1, 6)).toEqual({
      clave: 'emergencia.mensajeConstruyendo',
      tono: 'neutral',
      valores: { meses: 1, metaMeses: 6 },
    })
  })

  it('por debajo de la meta (1 mes o más) -> construyendo, con meses y metaMeses', () => {
    expect(mensajeFondo(4, 6)).toEqual({
      clave: 'emergencia.mensajeConstruyendo',
      tono: 'neutral',
      valores: { meses: 4, metaMeses: 6 },
    })
  })

  it('frontera: exactamente la meta ya cuenta como lograda', () => {
    expect(mensajeFondo(6, 6)).toEqual({
      clave: 'emergencia.mensajeMetaLograda',
      tono: 'positivo',
      valores: { meses: 6, metaMeses: 6 },
    })
  })

  it('meta superada pero todavía debajo de 12 meses -> meta lograda', () => {
    expect(mensajeFondo(8, 3)).toEqual({
      clave: 'emergencia.mensajeMetaLograda',
      tono: 'positivo',
      valores: { meses: 8, metaMeses: 3 },
    })
  })

  it('frontera: exactamente 12 meses -> finanzas sanas, ya no depende de la meta', () => {
    expect(mensajeFondo(12, 6)).toEqual({
      clave: 'emergencia.mensajeFinanzasSanas',
      tono: 'positivo',
      valores: { meses: 12 },
    })
  })

  it('más de 12 meses -> finanzas sanas', () => {
    expect(mensajeFondo(20, 6)).toEqual({
      clave: 'emergencia.mensajeFinanzasSanas',
      tono: 'positivo',
      valores: { meses: 20 },
    })
  })

  it('meta ambiciosa (>12): por debajo de ELLA gana "construyendo" aunque ya haya 12+ meses', () => {
    // Decisión de producto documentada en mensajeFondo.js: con una meta de
    // 24 meses, tener 20 cubiertos sigue siendo "por debajo de tu meta",
    // no "ya llegaste" -- aunque 20 sería "finanzas sanas" con una meta más
    // chica. Este test fija ese comportamiento a propósito.
    expect(mensajeFondo(20, 24)).toEqual({
      clave: 'emergencia.mensajeConstruyendo',
      tono: 'neutral',
      valores: { meses: 20, metaMeses: 24 },
    })
  })

  it('caso defensivo: un valor negativo se trata igual que "menos de 1 mes"', () => {
    expect(mensajeFondo(-1, 6)).toEqual({
      clave: 'emergencia.mensajeConstruyendoUrgente',
      tono: 'alerta',
      valores: { meses: -1 },
    })
  })
})
