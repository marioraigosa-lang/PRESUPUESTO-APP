import { afterEach, describe, expect, it, vi } from 'vitest'
import { vieneDeEnlaceAuth, vieneDeEnlaceConfirmacion, vieneDeEnlaceRecuperacion } from './urlsAuth'

// vitest corre en entorno 'node' (ver vite.config.js): no hay `window`.
function conUrl(search, hash = '') {
  vi.stubGlobal('window', { location: { origin: 'https://seed.test', pathname: '/', search, hash } })
}

describe('detección de enlaces de auth', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reconoce el regreso de confirmación de cuenta, válido o vencido', () => {
    conUrl('?tipo=cuenta-confirmada')
    expect(vieneDeEnlaceConfirmacion()).toBe(true)
    expect(vieneDeEnlaceAuth()).toBe(true)

    conUrl('?tipo=cuenta-confirmada', '#error=access_denied&error_code=otp_expired')
    expect(vieneDeEnlaceConfirmacion()).toBe(true)
    expect(vieneDeEnlaceAuth()).toBe(true)
  })

  it('reconoce el regreso de recuperación de contraseña, válido o vencido', () => {
    conUrl('?tipo=restablecer-contrasena')
    expect(vieneDeEnlaceRecuperacion()).toBe(true)
    expect(vieneDeEnlaceAuth()).toBe(true)

    conUrl('?tipo=restablecer-contrasena', '#error=access_denied&error_code=otp_expired')
    expect(vieneDeEnlaceAuth()).toBe(true)
  })

  it('una visita normal (sin marca) no cuenta como enlace de auth', () => {
    conUrl('')
    expect(vieneDeEnlaceAuth()).toBe(false)

    conUrl('?utm_source=instagram')
    expect(vieneDeEnlaceAuth()).toBe(false)

    // Un error en el hash sin nuestra marca no es de nuestros flujos.
    conUrl('', '#error=access_denied')
    expect(vieneDeEnlaceAuth()).toBe(false)
  })
})
