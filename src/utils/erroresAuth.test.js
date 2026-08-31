import { describe, expect, it } from 'vitest'
import { traducirErrorAuth } from './erroresAuth'

// traducirErrorAuth NO arma el texto final, devuelve la CLAVE de traducción
// según el mensaje (en inglés, siempre) que devuelve Supabase. Acá se
// prueba que cada patrón conocido caiga en su clave correcta, y que
// cualquier mensaje no reconocido caiga en el genérico en vez de mostrar
// texto crudo en inglés al usuario.
describe('traducirErrorAuth', () => {
  it('credenciales inválidas', () => {
    expect(traducirErrorAuth('Invalid login credentials')).toBe('auth.errorCredenciales')
  })

  it('correo no confirmado', () => {
    expect(traducirErrorAuth('Email not confirmed')).toBe('auth.errorEmailNoConfirmado')
  })

  it('correo ya registrado: primera variante del patrón ("user already registered")', () => {
    expect(traducirErrorAuth('User already registered')).toBe('auth.errorYaRegistrado')
  })

  it('correo ya registrado: segunda variante del patrón ("already been registered")', () => {
    expect(traducirErrorAuth('This email has already been registered')).toBe('auth.errorYaRegistrado')
  })

  it('contraseña muy corta', () => {
    expect(traducirErrorAuth('Password should be at least 6 characters')).toBe('auth.errorPasswordCorta')
  })

  it('correo con formato inválido', () => {
    expect(traducirErrorAuth('Unable to validate email address: invalid format')).toBe(
      'auth.errorEmailInvalido',
    )
  })

  it('límite de intentos', () => {
    expect(traducirErrorAuth('Email rate limit exceeded')).toBe('auth.errorLimiteIntentos')
  })

  it('sesión expirada: variante "auth session missing"', () => {
    expect(traducirErrorAuth('Auth session missing!')).toBe('auth.errorSesionExpirada')
  })

  it('sesión expirada: variante "session ... expired"', () => {
    expect(traducirErrorAuth('Your session has expired')).toBe('auth.errorSesionExpirada')
  })

  it('sesión expirada: variante "jwt expired"', () => {
    expect(traducirErrorAuth('jwt expired')).toBe('auth.errorSesionExpirada')
  })

  it('no distingue mayúsculas/minúsculas (los patrones son case-insensitive)', () => {
    expect(traducirErrorAuth('INVALID LOGIN CREDENTIALS')).toBe('auth.errorCredenciales')
  })

  it('un mensaje desconocido cae en el error genérico', () => {
    expect(traducirErrorAuth('Something totally unexpected happened')).toBe('auth.errorGenerico')
  })

  it('mensaje undefined cae en el error genérico (no revienta)', () => {
    expect(traducirErrorAuth(undefined)).toBe('auth.errorGenerico')
  })

  it('mensaje null cae en el error genérico (no revienta)', () => {
    expect(traducirErrorAuth(null)).toBe('auth.errorGenerico')
  })
})
