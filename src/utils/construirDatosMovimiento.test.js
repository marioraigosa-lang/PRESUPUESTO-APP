import { describe, expect, it } from 'vitest'
import { construirDatosMovimiento } from './construirDatosMovimiento'

// `t` de mentira: devuelve el texto español de las claves de respaldo que
// usa el helper, y la clave tal cual para cualquier otra (mismo criterio
// que el `traducir` real). Así los tests fijan el comportamiento sin
// depender del contenido de src/i18n.
const TEXTOS = {
  'movimientos.formulario.tipoIngreso': 'Ingreso',
  'movimientos.formulario.tipoRetiro': 'Retiro',
  'movimientos.formulario.tipoGasto': 'Gasto',
  'movimientos.formulario.cuentaGenerica': 'Cuenta',
}
// `t` de mentira: para las claves con interpolación ('tarjetas.pago.descripcion')
// devuelve un texto reconocible con el parámetro incrustado, igual que el real.
const t = (clave, params) => {
  if (clave === 'tarjetas.pago.descripcion') return `Pago ${params?.tarjeta ?? ''}`
  return TEXTOS[clave] ?? clave
}

const cuentas = [
  { id: 'c1', nombre: 'Nómina' },
  { id: 'c2', nombre: 'Ahorros' },
]
const categorias = [
  { id: 'cat1', nombre: 'Comida', emoji: '🍔' },
  { id: 'cat2', nombre: 'Transporte', emoji: '🚌' },
]
const tarjetas = [
  { id: 't1', nombre: 'Nu' },
  { id: 't2', nombre: 'Rappi' },
]
const contexto = { cuentas, categorias, tarjetas, t }

describe('construirDatosMovimiento', () => {
  describe('ingreso', () => {
    it('arma el objeto con cuenta destino, emoji 💰 y descripción de respaldo', () => {
      const datos = construirDatosMovimiento(
        { tipo: 'ingreso', monto: '1500', cuentaId: 'c1', descripcion: '' },
        contexto,
      )
      expect(datos).toEqual({
        tipo: 'ingreso',
        monto: 1500,
        cuentaId: 'c1',
        tarjetaId: null,
        cuentaDestinoId: null,
        categoriaId: null,
        emoji: '💰',
        icono: 'arrow-down-left',
        descripcion: 'Ingreso',
      })
    })

    it('respeta la descripción del usuario (recortada)', () => {
      const datos = construirDatosMovimiento(
        { tipo: 'ingreso', monto: '1500', cuentaId: 'c1', descripcion: '  Salario de agosto  ' },
        contexto,
      )
      expect(datos.descripcion).toBe('Salario de agosto')
    })
  })

  describe('gasto con cuenta', () => {
    it('toma el emoji y el nombre de la categoría como descripción de respaldo', () => {
      const datos = construirDatosMovimiento(
        {
          tipo: 'gasto',
          origen: 'cuenta',
          monto: '20',
          cuentaId: 'c1',
          categoriaId: 'cat1',
          descripcion: '',
        },
        contexto,
      )
      expect(datos).toEqual({
        tipo: 'gasto',
        monto: 20,
        cuentaId: 'c1',
        tarjetaId: null,
        cuentaDestinoId: null,
        categoriaId: 'cat1',
        emoji: '🍔',
        icono: 'utensils',
        descripcion: 'Comida',
      })
    })

    it('cae a emoji ✨ e icono sparkles, y descripción "Gasto", si la categoría no está en la lista', () => {
      const datos = construirDatosMovimiento(
        {
          tipo: 'gasto',
          origen: 'cuenta',
          monto: '20',
          cuentaId: 'c1',
          categoriaId: 'inexistente',
          descripcion: '',
        },
        contexto,
      )
      expect(datos.emoji).toBe('✨')
      expect(datos.icono).toBe('sparkles')
      expect(datos.descripcion).toBe('Gasto')
    })

    it('respeta la descripción del usuario', () => {
      const datos = construirDatosMovimiento(
        {
          tipo: 'gasto',
          origen: 'cuenta',
          monto: '20',
          cuentaId: 'c1',
          categoriaId: 'cat1',
          descripcion: 'Almuerzo con el equipo',
        },
        contexto,
      )
      expect(datos.descripcion).toBe('Almuerzo con el equipo')
    })

    it('con categoriaId vacío (sin categorías propias), guarda categoriaId null, no "" (columna uuid)', () => {
      const datos = construirDatosMovimiento(
        {
          tipo: 'gasto',
          origen: 'cuenta',
          monto: '20',
          cuentaId: 'c1',
          categoriaId: '',
          descripcion: '',
        },
        contexto,
      )
      expect(datos.categoriaId).toBeNull()
      expect(datos.emoji).toBe('✨')
      expect(datos.icono).toBe('sparkles')
      expect(datos.descripcion).toBe('Gasto')
    })
  })

  describe('gasto con tarjeta', () => {
    it('pone cuentaId en null, conserva tarjetaId y categoría, y parsea decimales', () => {
      const datos = construirDatosMovimiento(
        {
          tipo: 'gasto',
          origen: 'tarjeta',
          monto: '99.99',
          cuentaId: 'c1',
          tarjetaId: 't1',
          categoriaId: 'cat2',
          descripcion: '',
        },
        contexto,
      )
      expect(datos).toEqual({
        tipo: 'gasto',
        monto: 99.99,
        cuentaId: null,
        tarjetaId: 't1',
        cuentaDestinoId: null,
        categoriaId: 'cat2',
        emoji: '🚌',
        icono: 'bus',
        descripcion: 'Transporte',
      })
    })
  })

  describe('traslado', () => {
    it('arma "origen → destino" como descripción de respaldo y anula categoría/tarjeta', () => {
      const datos = construirDatosMovimiento(
        {
          tipo: 'traslado',
          monto: '500',
          cuentaId: 'c1',
          cuentaDestinoId: 'c2',
          categoriaId: 'cat1',
          descripcion: '',
        },
        contexto,
      )
      expect(datos).toEqual({
        tipo: 'traslado',
        monto: 500,
        cuentaId: 'c1',
        tarjetaId: null,
        cuentaDestinoId: 'c2',
        categoriaId: null,
        emoji: '🔄',
        icono: 'arrow-left-right',
        descripcion: 'Nómina → Ahorros',
      })
    })

    it('usa "Cuenta" genérica cuando alguna de las cuentas no está en la lista', () => {
      const datos = construirDatosMovimiento(
        { tipo: 'traslado', monto: '500', cuentaId: 'cX', cuentaDestinoId: 'c2', descripcion: '' },
        contexto,
      )
      expect(datos.descripcion).toBe('Cuenta → Ahorros')
    })

    it('respeta la descripción del usuario', () => {
      const datos = construirDatosMovimiento(
        {
          tipo: 'traslado',
          monto: '500',
          cuentaId: 'c1',
          cuentaDestinoId: 'c2',
          descripcion: 'Ahorro del mes',
        },
        contexto,
      )
      expect(datos.descripcion).toBe('Ahorro del mes')
    })
  })

  describe('retiro', () => {
    it('emoji 🏧, descripción "Retiro" y todos los ids salvo la cuenta en null', () => {
      const datos = construirDatosMovimiento(
        { tipo: 'retiro', monto: '100', cuentaId: 'c2', descripcion: '' },
        contexto,
      )
      expect(datos).toEqual({
        tipo: 'retiro',
        monto: 100,
        cuentaId: 'c2',
        tarjetaId: null,
        cuentaDestinoId: null,
        categoriaId: null,
        emoji: '🏧',
        icono: 'banknote',
        descripcion: 'Retiro',
      })
    })

    it('respeta la descripción del usuario', () => {
      const datos = construirDatosMovimiento(
        { tipo: 'retiro', monto: '100', cuentaId: 'c2', descripcion: 'Efectivo cajero' },
        contexto,
      )
      expect(datos.descripcion).toBe('Efectivo cajero')
    })
  })

  describe('pago_tarjeta', () => {
    it('arma el objeto que espera pagarTarjeta: cuenta_id Y tarjeta_id, categoría null, emoji 💳', () => {
      const datos = construirDatosMovimiento(
        { tipo: 'pago_tarjeta', monto: '150', cuentaId: 'c2', tarjetaId: 't1', descripcion: '' },
        contexto,
      )
      expect(datos).toEqual({
        tipo: 'pago_tarjeta',
        monto: 150,
        cuentaId: 'c2',
        tarjetaId: 't1',
        cuentaDestinoId: null,
        categoriaId: null,
        emoji: '💳',
        icono: 'credit-card',
        descripcion: 'Pago Nu',
      })
    })

    it('respeta la descripción del usuario (recortada)', () => {
      const datos = construirDatosMovimiento(
        { tipo: 'pago_tarjeta', monto: '150', cuentaId: 'c2', tarjetaId: 't1', descripcion: '  Pago quincena  ' },
        contexto,
      )
      expect(datos.descripcion).toBe('Pago quincena')
    })

    it('cae a "Cuenta" genérica en la descripción si la tarjeta no está en la lista', () => {
      const datos = construirDatosMovimiento(
        { tipo: 'pago_tarjeta', monto: '150', cuentaId: 'c2', tarjetaId: 'inexistente', descripcion: '' },
        contexto,
      )
      expect(datos.descripcion).toBe('Pago Cuenta')
    })
  })

  it('ignora el origen "tarjeta" si el tipo no es gasto (nunca anula la cuenta)', () => {
    const datos = construirDatosMovimiento(
      { tipo: 'ingreso', origen: 'tarjeta', monto: '10', cuentaId: 'c1', descripcion: '' },
      contexto,
    )
    expect(datos.cuentaId).toBe('c1')
    expect(datos.tarjetaId).toBeNull()
  })
})
