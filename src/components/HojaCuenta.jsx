import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Interruptor from './Interruptor'
import AyudaContextual from './AyudaContextual'
import { useIdioma } from '../context/IdiomaContext'
import { useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import { COLORES_CUENTA } from '../utils/coloresCuenta'
import MensajeError from './ui/MensajeError'

function HojaCuenta({ abierta, onCerrar, onGuardar, onActualizar, cuentaEditando }) {
  const editando = Boolean(cuentaEditando)
  const { t } = useIdioma()
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [color, setColor] = useState(COLORES_CUENTA[0])
  const [saldo, setSaldo] = useState('')
  const [esAhorro, setEsAhorro] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (cuentaEditando) {
      setNombre(cuentaEditando.nombre)
      setTipo(cuentaEditando.tipo || '')
      setColor(cuentaEditando.color || COLORES_CUENTA[0])
      setSaldo(String(cuentaEditando.saldo ?? ''))
      setEsAhorro(Boolean(cuentaEditando.es_ahorro))
    } else {
      setNombre('')
      setTipo('')
      setColor(COLORES_CUENTA[0])
      setSaldo('')
      setEsAhorro(false)
    }
    setError('')
    setErrorGuardado('')
  }, [abierta, cuentaEditando])

  if (!abierta) return null

  function cerrarYLimpiar() {
    setError('')
    setErrorGuardado('')
    onCerrar()
  }

  function manejarCambioNombre(evento) {
    setNombre(evento.target.value)
    setError('')
  }

  function manejarCambioSaldo(evento) {
    setSaldo(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!nombre.trim()) {
      setError(t('cuentas.formulario.errorNombreVacio'))
      return
    }
    if (saldo === '' || Number(saldo) < 0) {
      setError(t('cuentas.formulario.errorSaldoInvalido'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      nombre: nombre.trim(),
      tipo: tipo.trim(),
      color,
      saldo: Number(saldo),
      esAhorro,
    }

    try {
      if (editando) {
        await onActualizar(cuentaEditando.id, datos)
      } else {
        await onGuardar(datos)
      }

      cerrarYLimpiar()
    } catch (err) {
      console.error(err)
      setErrorGuardado(true)
    } finally {
      setGuardando(false)
    }
  }

  const saldoFormateado = formatearEntradaMonto(saldo, moneda)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('cuentas.formulario.cerrarAria')}
        onClick={cerrarYLimpiar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarGuardar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel shadow-elevated p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">
            {editando ? t('cuentas.formulario.editarTitulo') : t('cuentas.formulario.nuevoTitulo')}
          </h2>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('cuentas.formulario.cerrarAria')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label htmlFor="nombreCuenta" className="mb-1 block text-xs text-text-dim">
            {t('cuentas.formulario.nombreLabel')}
          </label>
          <input
            id="nombreCuenta"
            type="text"
            value={nombre}
            onChange={manejarCambioNombre}
            placeholder={t('cuentas.formulario.nombrePlaceholder')}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <label htmlFor="tipoCuenta" className="mb-1 block text-xs text-text-dim">
            {t('cuentas.formulario.tipoLabel')}
          </label>
          <input
            id="tipoCuenta"
            type="text"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
            placeholder={t('cuentas.formulario.tipoPlaceholder')}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">{t('cuentas.formulario.colorLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {COLORES_CUENTA.map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-label={t('cuentas.formulario.colorAria', { color: opcion })}
                onClick={() => setColor(opcion)}
                className={`h-8 w-8 rounded-full transition-shadow ${
                  color === opcion ? 'ring-2 ring-text ring-offset-2 ring-offset-panel' : ''
                }`}
                style={{ backgroundColor: opcion }}
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="saldoCuenta" className="mb-1 block text-xs text-text-dim">
            {t('cuentas.formulario.saldoLabel')}
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="saldoCuenta"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="0"
              value={saldoFormateado}
              onChange={manejarCambioSaldo}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-panel-2 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-text">{t('cuentas.formulario.esAhorroPregunta')}</p>
              <AyudaContextual
                clave="guia.ayuda.cuentaEsAhorro"
                etiqueta={t('guia.ayuda.cuentaEsAhorroAria')}
              />
            </div>
            <p className="mt-0.5 text-xs leading-snug text-text-dim">
              {t('cuentas.formulario.esAhorroAyuda')}
            </p>
          </div>
          <Interruptor
            activo={esAhorro}
            onCambiar={() => setEsAhorro((actual) => !actual)}
            etiqueta={t('cuentas.formulario.esAhorroAria')}
          />
        </div>

        <MensajeError>{error}</MensajeError>
        {errorGuardado && <MensajeError>{t('cuentas.formulario.errorGuardar')}</MensajeError>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando
            ? t('cuentas.formulario.guardando')
            : editando
              ? t('cuentas.formulario.guardarCambios')
              : t('cuentas.formulario.guardarCuenta')}
        </button>
      </form>
    </div>
  )
}

export default HojaCuenta
