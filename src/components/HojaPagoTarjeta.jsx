import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useMoneda, useFormatoMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import MensajeError from './ui/MensajeError'

// Hoja para pagar (total o parcialmente) la deuda de una tarjeta desde una
// cuenta de ahorro -- Fase 5 del plan de tarjetas de crédito. Calco de dos
// hojas existentes: el input de monto es el mismo mecanismo formateado de
// HojaNuevoMovimiento/HojaTarjeta, y el selector de cuenta es el mismo
// patrón de "tarjetas" (botones con avatar + saldo) de
// HojaElegirCuentaPago -- con una diferencia de fondo: acá el monto viene
// PRELLENADO con la deuda total (pago completo por defecto) y el usuario lo
// baja si quiere pagar solo una parte, pero nunca puede subirlo por encima
// de la deuda actual (sobrepago bloqueado acá Y en
// services/movimientos.js/pagarTarjeta, que vuelve a validar del lado del
// servicio -- mismo criterio de "defensa doble" que ya usa HojaTarjeta con
// el cupo).
function HojaPagoTarjeta({ abierta, onCerrar, tarjeta, cuentas, onConfirmar }) {
  const { t } = useIdioma()
  const { moneda } = useMoneda()
  const formatear = useFormatoMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const [monto, setMonto] = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta || !tarjeta) return
    setMonto(String(tarjeta.deuda ?? 0))
    setCuentaId(cuentas[0]?.id ?? '')
    setError('')
    setErrorGuardado('')
  }, [abierta, tarjeta, cuentas])

  if (!abierta || !tarjeta) return null

  const deudaActual = tarjeta.deuda ?? 0

  function cerrarYLimpiar() {
    if (guardando) return
    setError('')
    setErrorGuardado('')
    onCerrar()
  }

  function manejarCambioMonto(evento) {
    setMonto(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  async function manejarConfirmar(evento) {
    evento.preventDefault()

    const montoNumero = Number(monto)

    if (!monto || montoNumero <= 0) {
      setError(t('tarjetas.pago.errorMontoInvalido'))
      return
    }
    // Bloqueo de SOBREPAGO del lado del formulario -- el servicio vuelve a
    // validar esto mismo antes de escribir, sin importar qué llegue acá;
    // esta comprobación solo evita el viaje de red cuando ya se sabe que va
    // a fallar.
    if (montoNumero > deudaActual) {
      setError(t('tarjetas.pago.errorSobrepago', { monto: formatear(deudaActual) }))
      return
    }
    if (!cuentaId) {
      setError(t('tarjetas.pago.errorSinCuenta'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    try {
      await onConfirmar({
        monto: montoNumero,
        cuentaId,
        emoji: '💳',
        descripcion: t('tarjetas.pago.descripcion', { tarjeta: tarjeta.nombre }),
      })
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
        aria-label={t('tarjetas.pago.cerrarAria')}
        onClick={cerrarYLimpiar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarConfirmar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel shadow-elevated p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text">{t('tarjetas.pago.titulo')}</h2>
            <p className="truncate text-xs text-text-dim">
              {tarjeta.nombre} · {t('tarjetas.pago.deudaActualLabel')}: {formatear(deudaActual)}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('tarjetas.pago.cerrarAria')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label htmlFor="montoPago" className="mb-1 block text-xs text-text-dim">
            {t('tarjetas.pago.montoLabel')}
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="montoPago"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="0"
              value={montoFormateado}
              onChange={manejarCambioMonto}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim"
            />
          </div>
          {error && <MensajeError className="mt-1 px-3 py-2 text-xs">{error}</MensajeError>}
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">{t('tarjetas.pago.cuentaLabel')}</p>

          {cuentas.length === 0 ? (
            <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
              {t('tarjetas.pago.sinCuentas')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {cuentas.map((cuenta) => {
                const activo = cuenta.id === cuentaId
                return (
                  <button
                    key={cuenta.id}
                    type="button"
                    onClick={() => setCuentaId(cuenta.id)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      activo ? 'bg-mint/15 ring-1 ring-mint' : 'bg-panel-2'
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-bg"
                      style={{ backgroundColor: cuenta.color }}
                    >
                      {cuenta.inicial || cuenta.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{cuenta.nombre}</p>
                      <p className="truncate text-xs text-text-dim">{formatear(cuenta.saldo)}</p>
                    </div>
                    {activo && <Check className="h-4 w-4 shrink-0 text-mint" strokeWidth={3} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {errorGuardado && <MensajeError>{t('tarjetas.pago.errorGuardar')}</MensajeError>}

        <button
          type="submit"
          disabled={guardando || cuentas.length === 0}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? t('tarjetas.pago.guardando') : t('tarjetas.pago.confirmar')}
        </button>
      </form>
    </div>
  )
}

export default HojaPagoTarjeta
