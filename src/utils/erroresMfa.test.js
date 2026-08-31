import { describe, expect, it } from 'vitest'
import { traducirErrorMfa } from './erroresMfa'

// Mismo criterio que erroresAuth.test.js: se prueba que cada patrón de
// error de supabase.auth.mfa.* caiga en su clave correcta, y que un mensaje
// no reconocido caiga en el genérico de seguridad (no en el de auth).
describe('traducirErrorMfa', () => {
  it('código TOTP inválido', () => {
    expect(traducirErrorMfa('Invalid TOTP code')).toBe('seguridad.errorCodigoInvalido')
  })

  it('código inválido con la palabra "code" en vez de "totp"', () => {
    expect(traducirErrorMfa('Invalid verification code')).toBe('seguridad.errorCodigoInvalido')
  })

  it('requiere AAL2', () => {
    expect(traducirErrorMfa('AAL2 required for this action')).toBe('seguridad.errorRequiereAal2')
  })

  it('límite de intentos', () => {
    expect(traducirErrorMfa('Rate limit exceeded')).toBe('seguridad.errorLimiteIntentos')
  })

  it('factor duplicado: variante "already enrolled"', () => {
    expect(traducirErrorMfa('This factor is already enrolled')).toBe('seguridad.errorFactorDuplicado')
  })

  it('factor duplicado: variante "already exists"', () => {
    expect(traducirErrorMfa('A factor with this name already exists')).toBe(
      'seguridad.errorFactorDuplicado',
    )
  })

  it('factor duplicado: variante "friendly name" (sin la palabra "already")', () => {
    expect(traducirErrorMfa('friendly name must be unique')).toBe('seguridad.errorFactorDuplicado')
  })

  it('sesión expirada: comparte la misma clave que erroresAuth.js ("auth.errorSesionExpirada")', () => {
    expect(traducirErrorMfa('Auth session missing!')).toBe('auth.errorSesionExpirada')
    expect(traducirErrorMfa('jwt expired')).toBe('auth.errorSesionExpirada')
  })

  it('no distingue mayúsculas/minúsculas', () => {
    expect(traducirErrorMfa('INVALID TOTP CODE')).toBe('seguridad.errorCodigoInvalido')
  })

  it('un mensaje desconocido cae en el error genérico DE SEGURIDAD, no en el de auth', () => {
    expect(traducirErrorMfa('Something totally unexpected happened')).toBe('seguridad.errorGenerico')
  })

  it('mensaje undefined cae en el error genérico (no revienta)', () => {
    expect(traducirErrorMfa(undefined)).toBe('seguridad.errorGenerico')
  })

  it('mensaje null cae en el error genérico (no revienta)', () => {
    expect(traducirErrorMfa(null)).toBe('seguridad.errorGenerico')
  })
})
