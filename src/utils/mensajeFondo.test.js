import { describe, expect, it } from 'vitest'
import { mensajeFondo } from './mensajeFondo'

// mensajeFondo NO devuelve el texto final, devuelve una CLAVE de traducción
// + un "tono" (color/estilo). El texto en sí se prueba indirectamente: acá
// verificamos que la clave y el tono correctos se elijan según los meses
// de fondo de emergencia cubiertos, incluyendo las fronteras exactas entre
// tramos (1, 3 y 6 meses), que es donde más fácil se cuela un error de
// "menor que" vs "menor o igual que".
describe('mensajeFondo', () => {
  it('menos de 1 mes cubierto -> alerta', () => {
    expect(mensajeFondo(0)).toEqual({ clave: 'emergencia.mensajeMenosDeUnMes', tono: 'alerta' })
    expect(mensajeFondo(0.5)).toEqual({ clave: 'emergencia.mensajeMenosDeUnMes', tono: 'alerta' })
  })

  it('frontera: exactamente 1 mes YA NO cuenta como "menos de 1 mes"', () => {
    expect(mensajeFondo(1)).toEqual({ clave: 'emergencia.mensajeMenosDeTresMeses', tono: 'neutral' })
  })

  it('entre 1 y 3 meses (sin llegar a 3) -> neutral, tramo "menos de 3 meses"', () => {
    expect(mensajeFondo(2.9)).toEqual({ clave: 'emergencia.mensajeMenosDeTresMeses', tono: 'neutral' })
  })

  it('frontera: exactamente 3 meses pasa al tramo "menos de 6 meses"', () => {
    expect(mensajeFondo(3)).toEqual({ clave: 'emergencia.mensajeMenosDeSeisMeses', tono: 'neutral' })
  })

  it('entre 3 y 6 meses (sin llegar a 6) -> neutral, tramo "menos de 6 meses"', () => {
    expect(mensajeFondo(5.9)).toEqual({ clave: 'emergencia.mensajeMenosDeSeisMeses', tono: 'neutral' })
  })

  it('frontera: exactamente 6 meses o más -> positivo', () => {
    expect(mensajeFondo(6)).toEqual({ clave: 'emergencia.mensajeSeisMasMeses', tono: 'positivo' })
    expect(mensajeFondo(10)).toEqual({ clave: 'emergencia.mensajeSeisMasMeses', tono: 'positivo' })
  })

  it('caso defensivo: un valor negativo se trata igual que "menos de 1 mes"', () => {
    expect(mensajeFondo(-1)).toEqual({ clave: 'emergencia.mensajeMenosDeUnMes', tono: 'alerta' })
  })
})
