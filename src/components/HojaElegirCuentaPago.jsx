import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import MensajeError from './ui/MensajeError'

// Hoja que se abre al marcar un gasto fijo como pagado. El usuario elige EN
// ESE MOMENTO (cada mes puede ser distinto) si el pago sale de una CUENTA de
// ahorro (como siempre) o se carga a una TARJETA de crédito -- mismo selector
// Cuenta/Tarjeta que ya usa HojaNuevoMovimiento para un gasto normal. Si no
// hay ninguna tarjeta, el selector no aparece y la hoja se ve igual que
// antes. Devuelve el origen elegido como { cuentaId } o { tarjetaId } (nunca
// ambos) a onConfirmar.
function HojaElegirCuentaPago({ abierta, onCerrar, cuentas, tarjetas = [], gasto, onConfirmar }) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const [origen, setOrigen] = useState('cuenta')
  const [cuentaId, setCuentaId] = useState('')
  const [tarjetaId, setTarjetaId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return
    setCuentaId(cuentas[0]?.id ?? '')
    setTarjetaId(tarjetas[0]?.id ?? '')
    // Origen por defecto: "cuenta" si hay alguna; si no hay ninguna cuenta
    // pero sí tarjetas, se arranca en "tarjeta" para que el pago igual se
    // pueda registrar.
    setOrigen(cuentas.length === 0 && tarjetas.length > 0 ? 'tarjeta' : 'cuenta')
    setErrorGuardado('')
  }, [abierta, cuentas, tarjetas])

  if (!abierta || !gasto) return null

  const ofreceTarjeta = tarjetas.length > 0
  const usaTarjeta = origen === 'tarjeta'
  const tarjetaSeleccionada = tarjetas.find((tarjeta) => tarjeta.id === tarjetaId)
  // Aviso suave, no bloquea (mismo criterio que HojaNuevoMovimiento): el
  // usuario puede querer registrar el gasto igual y quedar con cupo negativo.
  const montoExcedeCupo =
    usaTarjeta && tarjetaSeleccionada && gasto.monto > tarjetaSeleccionada.cupo_disponible

  function cerrarYLimpiar() {
    if (guardando) return
    setErrorGuardado('')
    onCerrar()
  }

  async function manejarConfirmar(evento) {
    evento.preventDefault()

    if (usaTarjeta) {
      if (!tarjetaId) {
        setErrorGuardado(t('movimientos.elegirCuentaPago.errorSinTarjeta'))
        return
      }
    } else if (!cuentaId) {
      setErrorGuardado(t('movimientos.elegirCuentaPago.errorSinCuenta'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    try {
      await onConfirmar(usaTarjeta ? { tarjetaId } : { cuentaId })
    } catch (err) {
      console.error(err)
      setErrorGuardado(t('movimientos.elegirCuentaPago.errorGuardar'))
    } finally {
      setGuardando(false)
    }
  }

  const confirmarDeshabilitado = guardando || (usaTarjeta ? !tarjetaId : !cuentaId)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('movimientos.elegirCuentaPago.cerrarAria')}
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
            <h2 className="text-base font-semibold text-text">{t('movimientos.elegirCuentaPago.titulo')}</h2>
            <p className="truncate text-xs text-text-dim">
              {gasto.nombre} · {formatear(gasto.monto)}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('movimientos.elegirCuentaPago.cerrarAria')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {ofreceTarjeta && (
          <div>
            <p className="mb-1 text-xs text-text-dim">{t('movimientos.formulario.origenLabel')}</p>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-panel-2 p-1">
              <button
                type="button"
                onClick={() => setOrigen('cuenta')}
                className={`rounded-full py-2 text-xs font-medium transition-colors sm:text-sm ${
                  origen === 'cuenta' ? 'bg-mint text-bg' : 'text-text-dim'
                }`}
              >
                {t('movimientos.formulario.origenCuenta')}
              </button>
              <button
                type="button"
                onClick={() => setOrigen('tarjeta')}
                className={`rounded-full py-2 text-xs font-medium transition-colors sm:text-sm ${
                  origen === 'tarjeta' ? 'bg-coral text-bg' : 'text-text-dim'
                }`}
              >
                {t('movimientos.formulario.origenTarjeta')}
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs text-text-dim">
            {usaTarjeta
              ? t('movimientos.elegirCuentaPago.preguntaTarjeta')
              : t('movimientos.elegirCuentaPago.preguntaCuenta')}
          </p>

          {usaTarjeta ? (
            tarjetas.length === 0 ? (
              <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
                {t('movimientos.elegirCuentaPago.sinTarjetas')}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {tarjetas.map((tarjeta) => {
                  const activo = tarjeta.id === tarjetaId
                  return (
                    <button
                      key={tarjeta.id}
                      type="button"
                      onClick={() => setTarjetaId(tarjeta.id)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                        activo ? 'bg-coral/15 ring-1 ring-coral' : 'bg-panel-2'
                      }`}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-bg"
                        style={{ backgroundColor: tarjeta.color }}
                      >
                        {tarjeta.inicial || tarjeta.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">{tarjeta.nombre}</p>
                        <p className="truncate text-xs text-text-dim">
                          {t('movimientos.formulario.cupoDisponibleSufijo', {
                            monto: formatear(tarjeta.cupo_disponible),
                          })}
                        </p>
                      </div>
                      {activo && <Check className="h-4 w-4 shrink-0 text-coral" strokeWidth={3} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            )
          ) : cuentas.length === 0 ? (
            <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
              {t('movimientos.elegirCuentaPago.sinCuentas')}
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

          {montoExcedeCupo && (
            <p className="mt-2 text-xs text-coral">{t('movimientos.formulario.avisoCupoExcedido')}</p>
          )}
        </div>

        {errorGuardado && <MensajeError>{errorGuardado}</MensajeError>}

        <button
          type="submit"
          disabled={confirmarDeshabilitado}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? t('movimientos.elegirCuentaPago.guardando') : t('movimientos.elegirCuentaPago.confirmar')}
        </button>
      </form>
    </div>
  )
}

export default HojaElegirCuentaPago
