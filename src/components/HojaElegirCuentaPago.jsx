import { useEffect, useState } from 'react'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'

function HojaElegirCuentaPago({ abierta, onCerrar, cuentas, gasto, onConfirmar }) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const [cuentaId, setCuentaId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return
    setCuentaId(cuentas[0]?.id ?? '')
    setErrorGuardado('')
  }, [abierta, cuentas])

  if (!abierta || !gasto) return null

  function cerrarYLimpiar() {
    if (guardando) return
    setErrorGuardado('')
    onCerrar()
  }

  async function manejarConfirmar(evento) {
    evento.preventDefault()

    if (!cuentaId) {
      setErrorGuardado(t('movimientos.elegirCuentaPago.errorSinCuenta'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    try {
      await onConfirmar(cuentaId)
    } catch (err) {
      setErrorGuardado(err.message)
    } finally {
      setGuardando(false)
    }
  }

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
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel p-5 pb-6"
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
            ×
          </button>
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">{t('movimientos.elegirCuentaPago.preguntaCuenta')}</p>

          {cuentas.length === 0 ? (
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
                    {activo && <span className="shrink-0 text-sm font-semibold text-mint">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {errorGuardado && (
          <p className="text-xs text-coral">
            {t('movimientos.elegirCuentaPago.errorGuardar')}
            {errorGuardado}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando || !cuentaId}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? t('movimientos.elegirCuentaPago.guardando') : t('movimientos.elegirCuentaPago.confirmar')}
        </button>
      </form>
    </div>
  )
}

export default HojaElegirCuentaPago
