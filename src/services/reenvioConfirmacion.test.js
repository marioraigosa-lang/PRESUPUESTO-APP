import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reenviarConfirmacion } from './reenvioConfirmacion'

const { resendMock } = vi.hoisted(() => ({ resendMock: vi.fn() }))

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { resend: resendMock } },
}))

// vitest corre en entorno 'node' (ver vite.config.js): no hay `window`, y
// urlConfirmacionCuenta() lo necesita para armar la URL de regreso.
vi.stubGlobal('window', { location: { origin: 'https://seed.test', pathname: '/' } })

describe('reenviarConfirmacion', () => {
  beforeEach(() => {
    resendMock.mockReset()
    resendMock.mockResolvedValue({ data: {}, error: null })
  })

  it('siempre manda emailRedirectTo con la marca ?tipo=cuenta-confirmada', async () => {
    await reenviarConfirmacion('ana@ejemplo.com')

    expect(resendMock).toHaveBeenCalledTimes(1)
    const argumentos = resendMock.mock.calls[0][0]
    expect(argumentos.type).toBe('signup')
    expect(argumentos.options.emailRedirectTo).toBe('https://seed.test/?tipo=cuenta-confirmada')
  })

  it('limpia espacios alrededor del correo', async () => {
    await reenviarConfirmacion('  ana@ejemplo.com  ')

    expect(resendMock.mock.calls[0][0].email).toBe('ana@ejemplo.com')
  })

  it('devuelve la respuesta de Supabase tal cual (incluido el error de cooldown)', async () => {
    const error = { message: 'For security purposes, you can only request this after 57 seconds.' }
    resendMock.mockResolvedValueOnce({ data: null, error })

    const resultado = await reenviarConfirmacion('ana@ejemplo.com')

    expect(resultado.error).toBe(error)
  })
})
