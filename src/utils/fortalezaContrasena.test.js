import { describe, expect, it } from 'vitest'
import { evaluarFortalezaContrasena } from './fortalezaContrasena'

describe('evaluarFortalezaContrasena', () => {
  it('contraseña vacía es "debil" con puntuación 0', () => {
    expect(evaluarFortalezaContrasena('')).toEqual({ nivel: 'debil', puntuacion: 0 })
  })

  it('contraseña corta (menos de 10) es siempre "debil", aunque tenga variedad', () => {
    // 8 caracteres, con minúscula/mayúscula/número/símbolo: la variedad no
    // alcanza a compensar estar por debajo del mínimo bloqueante.
    expect(evaluarFortalezaContrasena('Aa1!Aa1!').nivel).toBe('debil')
  })

  it('solo números, sin variedad, es "debil"', () => {
    expect(evaluarFortalezaContrasena('0123456789').nivel).toBe('debil')
  })

  it('palabra larga en minúsculas sin variedad es "debil"', () => {
    expect(evaluarFortalezaContrasena('contrasena').nivel).toBe('debil')
  })

  it('10 caracteres con minúscula y mayúscula y número es "media"', () => {
    expect(evaluarFortalezaContrasena('Contrasena1').nivel).toBe('media')
  })

  it('12 caracteres con las 4 variedades es "fuerte"', () => {
    expect(evaluarFortalezaContrasena('Contrasena1!').nivel).toBe('fuerte')
  })

  it('larga (16+) con las 4 variedades es "muy_fuerte"', () => {
    expect(evaluarFortalezaContrasena('C0ntras3naLarga!').nivel).toBe('muy_fuerte')
  })

  it('penaliza repeticiones obvias del mismo carácter', () => {
    // Mismo largo (12) y misma variedad de caracteres en ambas -- la única
    // diferencia es la corrida de "a" repetida en la primera.
    const conRepeticion = evaluarFortalezaContrasena('Aaaaaaaaaa1!')
    const sinRepeticion = evaluarFortalezaContrasena('Bq3xTr9zLm#8')
    expect(conRepeticion.puntuacion).toBeLessThan(sinRepeticion.puntuacion)
  })

  it('penaliza secuencias obvias como "1234" o "abcd"', () => {
    const conSecuencia = evaluarFortalezaContrasena('MiClave1234!')
    const sinSecuencia = evaluarFortalezaContrasena('MiClave8462!')
    expect(conSecuencia.puntuacion).toBeLessThan(sinSecuencia.puntuacion)
  })

  it('la puntuación nunca es negativa', () => {
    expect(evaluarFortalezaContrasena('aaa').puntuacion).toBeGreaterThanOrEqual(0)
  })

  it('más longitud y más variedad siempre suma o iguala, nunca resta (sin patrones obvios)', () => {
    const corta = evaluarFortalezaContrasena('Ax7qwT9z')
    const larga = evaluarFortalezaContrasena('Ax7qwT9zRbmP')
    expect(larga.puntuacion).toBeGreaterThanOrEqual(corta.puntuacion)
  })
})
