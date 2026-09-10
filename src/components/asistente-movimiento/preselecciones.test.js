import { describe, expect, it } from 'vitest'
import { idValidoEnLista } from './preselecciones'

const cuentas = [{ id: 'c1' }, { id: 'c2' }]

describe('idValidoEnLista', () => {
  it('devuelve el id si existe en la lista', () => {
    expect(idValidoEnLista('c1', cuentas)).toBe('c1')
  })

  it('devuelve "" si el id no existe en la lista (borrado, obsoleto)', () => {
    expect(idValidoEnLista('fantasma', cuentas)).toBe('')
  })

  it('devuelve "" si no se pasó ningún id', () => {
    expect(idValidoEnLista('', cuentas)).toBe('')
    expect(idValidoEnLista(undefined, cuentas)).toBe('')
  })

  it('devuelve "" con una lista vacía', () => {
    expect(idValidoEnLista('c1', [])).toBe('')
  })
})
