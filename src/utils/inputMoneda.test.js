import { describe, expect, it } from 'vitest'
import { formatearEntradaMonto, limpiarEntradaMonto } from './inputMoneda'

// Estas dos funciones controlan el estado "canónico" (siempre con '.' como
// separador decimal, sin importar la moneda) que se guarda mientras el
// usuario escribe un monto. Si se rompen, el número que termina guardado en
// Supabase puede quedar corrupto o truncado sin que nada lo avise en
// pantalla -- por eso importa cubrir bien los separadores por moneda.
describe('limpiarEntradaMonto', () => {
  describe('COP (0 decimales): descarta CUALQUIER punto o coma, no distingue miles de decimal', () => {
    it('quita los separadores de miles', () => {
      expect(limpiarEntradaMonto('1.234.567', 'COP')).toBe('1234567')
    })

    it('descarta cualquier caracter no numérico (incluida una coma decimal mal tecleada)', () => {
      expect(limpiarEntradaMonto('1234,56', 'COP')).toBe('123456')
    })

    it('entrada vacía se queda vacía', () => {
      expect(limpiarEntradaMonto('', 'COP')).toBe('')
    })

    it('entrada con letras u otros símbolos: solo deja los dígitos', () => {
      expect(limpiarEntradaMonto('$abc1.234.567xyz', 'COP')).toBe('1234567')
    })
  })

  describe('USD (2 decimales): coma es separador de miles, punto es decimal', () => {
    it('quita las comas de miles y conserva el punto decimal', () => {
      expect(limpiarEntradaMonto('1,234.56', 'USD')).toBe('1234.56')
    })

    it('trunca a 2 decimales si el usuario escribe más', () => {
      expect(limpiarEntradaMonto('10.999', 'USD')).toBe('10.99')
    })

    it('dos puntos decimales tecleados: conserva solo el primero como separador', () => {
      // "1234.56.78" -> se descartan los puntos de más, y lo que sobra se
      // trata como parte del decimal (y luego se trunca a 2).
      expect(limpiarEntradaMonto('1234.56.78', 'USD')).toBe('1234.56')
    })

    it('entrada vacía se queda vacía', () => {
      expect(limpiarEntradaMonto('', 'USD')).toBe('')
    })

    it('entrada con caracteres no numéricos: los descarta y conserva el punto', () => {
      expect(limpiarEntradaMonto('US$1,234.5x', 'USD')).toBe('1234.5')
    })
  })

  describe('EUR (2 decimales): punto es separador de miles, coma es decimal', () => {
    it('quita los puntos de miles y convierte la coma decimal a punto (canónico)', () => {
      expect(limpiarEntradaMonto('1.234,56', 'EUR')).toBe('1234.56')
    })

    it('trunca a 2 decimales si el usuario escribe más', () => {
      expect(limpiarEntradaMonto('10,999', 'EUR')).toBe('10.99')
    })

    it('dos comas decimales tecleadas: conserva solo la primera', () => {
      expect(limpiarEntradaMonto('12,34,56', 'EUR')).toBe('12.34')
    })
  })

  describe('el mismo texto crudo se interpreta distinto según la moneda activa', () => {
    // Este es el caso que más fácil se rompe: "1.234" es "mil doscientos
    // treinta y cuatro" en COP/EUR (el punto es de miles), pero es "uno con
    // 23" en USD (el punto es decimal, truncado a 2 decimales).
    it('"1.234" en COP: el punto se descarta, queda como miles', () => {
      expect(limpiarEntradaMonto('1.234', 'COP')).toBe('1234')
    })

    it('"1.234" en EUR: el punto es separador de miles, se descarta', () => {
      expect(limpiarEntradaMonto('1.234', 'EUR')).toBe('1234')
    })

    it('"1.234" en USD: el punto es el separador DECIMAL, se trunca a 2 decimales', () => {
      expect(limpiarEntradaMonto('1.234', 'USD')).toBe('1.23')
    })
  })
})

describe('formatearEntradaMonto', () => {
  it('valor canónico vacío devuelve string vacío', () => {
    expect(formatearEntradaMonto('', 'COP')).toBe('')
  })

  it('COP: formatea los miles con punto, sin decimales', () => {
    expect(formatearEntradaMonto('1234567', 'COP')).toBe('1.234.567')
  })

  it('COP: un valor canónico con parte decimal (no debería ocurrir en la práctica) igual ignora los decimales', () => {
    // limpiarEntradaMonto nunca produciría esto para COP (decimales: 0), pero
    // formatearEntradaMonto por sí sola no lo valida -- documenta que, si
    // llegara un punto decimal, simplemente se ignora.
    expect(formatearEntradaMonto('1234.5', 'COP')).toBe('1.234')
  })

  it('USD: formatea los miles con coma', () => {
    expect(formatearEntradaMonto('1234', 'USD')).toBe('1,234')
  })

  it('USD: sin parte decimal en el canónico, NO agrega ".00" (no es el formato final, es "mientras se escribe")', () => {
    expect(formatearEntradaMonto('1234', 'USD')).toBe('1,234')
  })

  it('USD: preserva un decimal parcial tal cual lo escribió el usuario, sin rellenar ceros', () => {
    expect(formatearEntradaMonto('1234.5', 'USD')).toBe('1,234.5')
  })

  it('USD: si el usuario acaba de teclear el punto decimal sin dígitos después, no se lo "come"', () => {
    expect(formatearEntradaMonto('1234.', 'USD')).toBe('1,234.')
  })

  it('EUR: formatea los miles con punto y el decimal con coma', () => {
    expect(formatearEntradaMonto('1234.56', 'EUR')).toBe('1.234,56')
  })

  it('EUR: preserva un decimal parcial con el separador de la moneda (coma), no con punto', () => {
    expect(formatearEntradaMonto('1234.5', 'EUR')).toBe('1.234,5')
  })

  it('formatea cero correctamente en las 3 monedas', () => {
    expect(formatearEntradaMonto('0', 'COP')).toBe('0')
    expect(formatearEntradaMonto('0', 'USD')).toBe('0')
    expect(formatearEntradaMonto('0', 'EUR')).toBe('0')
  })
})
