import { describe, expect, it } from 'vitest'
import { formatearMonto } from './formatoMoneda'

describe('formatearMonto', () => {
  describe('COP (pesos colombianos): sin decimales, símbolo "$" antes del número', () => {
    it('formatea un monto con miles separados por punto', () => {
      expect(formatearMonto(1234567, 'COP')).toBe('$1.234.567')
    })

    it('redondea a 0 decimales (COP no usa centavos)', () => {
      expect(formatearMonto(1234.5, 'COP')).toBe('$1.235')
    })

    it('formatea cero', () => {
      expect(formatearMonto(0, 'COP')).toBe('$0')
    })
  })

  describe('USD (dólares): 2 decimales, símbolo "US$" antes del número', () => {
    it('formatea un monto con miles separados por coma y 2 decimales', () => {
      expect(formatearMonto(1234567, 'USD')).toBe('US$1,234,567.00')
    })

    it('formatea un monto con centavos', () => {
      expect(formatearMonto(1234.5, 'USD')).toBe('US$1,234.50')
    })

    it('usa "US$" y no el símbolo "$" por defecto, para no confundirse con COP', () => {
      expect(formatearMonto(10, 'USD')).toBe('US$10.00')
    })
  })

  describe('EUR (euros): formato europeo, símbolo "€" DESPUÉS del número', () => {
    it('formatea un monto con miles separados por punto y decimales con coma', () => {
      expect(formatearMonto(1234567, 'EUR')).toBe('1.234.567,00 €')
    })

    it('formatea un monto con centavos', () => {
      expect(formatearMonto(1234.5, 'EUR')).toBe('1.234,50 €')
    })
  })

  describe('valores inválidos: no debe mostrar NaN/undefined en la pantalla', () => {
    it('trata undefined como 0', () => {
      expect(formatearMonto(undefined, 'COP')).toBe('$0')
    })

    it('trata null como 0', () => {
      expect(formatearMonto(null, 'COP')).toBe('$0')
    })

    it('trata un texto no numérico como 0', () => {
      expect(formatearMonto('abc', 'COP')).toBe('$0')
    })

    it('trata NaN como 0', () => {
      expect(formatearMonto(NaN, 'USD')).toBe('US$0.00')
    })
  })

  describe('moneda desconocida: usa COP como respaldo (MONEDA_POR_DEFECTO)', () => {
    it('formatea como COP si el código de moneda no existe', () => {
      expect(formatearMonto(1000, 'XXX')).toBe('$1.000')
    })
  })

  describe('montos negativos (posible caso real: saldo en descubierto)', () => {
    // El signo "-" siempre debe quedar al INICIO de todo el texto, antes
    // del símbolo, sin importar si ese símbolo va antes o después del
    // número en esa moneda.
    it('COP: el signo negativo va antes del símbolo ("-$", no "$-")', () => {
      expect(formatearMonto(-5000, 'COP')).toBe('-$5.000')
    })

    it('USD: el signo negativo va antes del símbolo ("-US$", no "US$-")', () => {
      expect(formatearMonto(-5000, 'USD')).toBe('-US$5,000.00')
    })

    it('EUR: el signo negativo va antes del número, formato europeo natural', () => {
      expect(formatearMonto(-5000, 'EUR')).toBe('-5.000,00 €')
    })

    it('con decimales y miles a la vez (USD negativo)', () => {
      expect(formatearMonto(-1234.5, 'USD')).toBe('-US$1,234.50')
    })

    it('un monto negativo menor a 1 (sin miles) sigue formateando bien el signo', () => {
      expect(formatearMonto(-0.5, 'USD')).toBe('-US$0.50')
    })
  })
})
