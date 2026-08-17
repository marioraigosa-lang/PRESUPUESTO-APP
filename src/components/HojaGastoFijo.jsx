import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import MensajeError from './ui/MensajeError'

function HojaGastoFijo({ abierta, onCerrar, onGuardar, onActualizar, gastoEditando }) {
  const editando = Boolean(gastoEditando)
  const montoBloqueado = editando && gastoEditando.pagado
  const { t } = useIdioma()
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [diaPago, setDiaPago] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (gastoEditando) {
      setNombre(gastoEditando.nombre)
      setMonto(String(gastoEditando.monto ?? ''))
      setDiaPago(gastoEditando.dia_pago ? String(gastoEditando.dia_pago) : '')
    } else {
      setNombre('')
      setMonto('')
      setDiaPago('')
    }
    setError('')
    setErrorGuardado('')
  }, [abierta, gastoEditando])

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

  function manejarCambioMonto(evento) {
    setMonto(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  function manejarCambioDiaPago(evento) {
    setDiaPago(evento.target.value.replace(/\D/g, '').slice(0, 2))
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!nombre.trim()) {
      setError(t('gastosFijos.formulario.errorNombreVacio'))
      return
    }
    if (monto === '' || Number(monto) <= 0) {
      setError(t('gastosFijos.formulario.errorMontoInvalido'))
      return
    }
    if (diaPago !== '' && (Number(diaPago) < 1 || Number(diaPago) > 31)) {
      setError(t('gastosFijos.formulario.errorDiaPagoInvalido'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      nombre: nombre.trim(),
      monto: Number(monto),
      diaPago: diaPago === '' ? null : Number(diaPago),
    }

    try {
      if (editando) {
        await onActualizar(gastoEditando, datos)
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

  const montoFormateado = formatearEntradaMonto(monto, moneda)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('gastosFijos.formulario.cerrarAria')}
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
            {editando ? t('gastosFijos.formulario.editarTitulo') : t('gastosFijos.formulario.nuevoTitulo')}
          </h2>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('gastosFijos.formulario.cerrarAria')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label htmlFor="nombreGastoFijo" className="mb-1 block text-xs text-text-dim">
            {t('gastosFijos.formulario.nombreLabel')}
          </label>
          <input
            id="nombreGastoFijo"
            type="text"
            value={nombre}
            onChange={manejarCambioNombre}
            placeholder={t('gastosFijos.formulario.nombrePlaceholder')}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <label htmlFor="montoGastoFijo" className="mb-1 block text-xs text-text-dim">
            {t('gastosFijos.formulario.montoLabel')}
          </label>
          <div
            className={`flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3 ${
              montoBloqueado ? 'opacity-60' : ''
            }`}
          >
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="montoGastoFijo"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="0"
              value={montoFormateado}
              onChange={manejarCambioMonto}
              disabled={montoBloqueado}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim disabled:cursor-not-allowed"
            />
          </div>
          {montoBloqueado && (
            <p className="mt-1 text-xs text-text-dim">{t('gastosFijos.formulario.montoBloqueadoAyuda')}</p>
          )}
        </div>

        <div>
          <label htmlFor="diaPagoGastoFijo" className="mb-1 block text-xs text-text-dim">
            {t('gastosFijos.formulario.diaPagoLabel')}
          </label>
          <input
            id="diaPagoGastoFijo"
            type="text"
            inputMode="numeric"
            value={diaPago}
            onChange={manejarCambioDiaPago}
            placeholder={t('gastosFijos.formulario.diaPagoPlaceholder')}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <MensajeError>{error}</MensajeError>
        {errorGuardado && <MensajeError>{t('gastosFijos.formulario.errorGuardar')}</MensajeError>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando
            ? t('gastosFijos.formulario.guardando')
            : editando
              ? t('gastosFijos.formulario.guardarCambios')
              : t('gastosFijos.formulario.guardarGastoFijo')}
        </button>
      </form>
    </div>
  )
}

export default HojaGastoFijo
