import { useEffect, useState } from 'react'
import { X, Check, AlertTriangle } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import { calcularPagosPorCuenta } from '../utils/pagosPorCuenta'
import MensajeError from './ui/MensajeError'

// Hoja de confirmación al eliminar una tarjeta que TIENE gastos (con deuda 0).
// Reasigna esos gastos a la cuenta desde la que se pagó la tarjeta y borra
// los pagos -- ver la RPC eliminar_tarjeta_usuario
// (sql/supabase_borrado_tarjetas_reasignacion.sql). Una tarjeta SIN gastos
// no llega acá: GestionTarjetas.jsx usa un window.confirm simple.
//
// Calco visual de HojaPagoTarjeta / HojaElegirCuentaPago (bottom sheet con
// selector de cuenta en botones con avatar + saldo). Dos modos según cuántas
// cuentas pagaron la tarjeta:
//   - 1 pagador  -> cuenta ya decidida, solo se muestra a cuál se cargarán
//     los gastos (sin selector). El saldo de esa cuenta no cambia.
//   - varios     -> selector de cuenta (default: la que más pagó) + aviso de
//     que los saldos individuales se ajustan aunque el total no cambie.
function HojaEliminarTarjeta({ abierta, onCerrar, tarjeta, cuentas = [], movimientosVersion, onConfirmar }) {
  const { t, tp } = useIdioma()
  const formatear = useFormatoMoneda()
  const { seleccionarPropio } = useDatosUsuario()

  const [cuentaId, setCuentaId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  // Todos los pagos de la tarjeta (de cualquier mes, no solo el visible):
  // consulta puntual, la hoja arma su propio estado de carga.
  const {
    datos: pagos,
    cargando: cargandoPagos,
    error: errorPagos,
  } = useConsulta(
    async () => {
      if (!abierta || !tarjeta?.id) return []
      const { data, error } = await seleccionarPropio('movimientos', 'id, cuenta_id, monto, tipo')
        .eq('tarjeta_id', tarjeta.id)
        .eq('tipo', 'pago_tarjeta')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    [abierta, tarjeta?.id, movimientosVersion],
    [],
  )

  const { hayVariosPagadores, cuentaSugerida } = calcularPagosPorCuenta(pagos)

  // Pre-selecciona la cuenta sugerida (la que más pagó). Mientras los pagos
  // cargan, cuentaSugerida es null y cae en la primera cuenta; al resolver
  // la consulta este efecto vuelve a correr y fija la sugerida.
  useEffect(() => {
    if (!abierta) return
    setCuentaId(cuentaSugerida ?? cuentas[0]?.id ?? '')
    setErrorGuardado('')
  }, [abierta, cuentaSugerida, cuentas])

  if (!abierta || !tarjeta) return null

  const cantidadGastos = tarjeta.cantidad_gastos ?? 0
  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId)
  const sinCuentas = cuentas.length === 0
  // Modo selector: varios pagadores, o (bordes raros) no se pudo determinar
  // una sola cuenta pagadora, o esa cuenta ya no está en la lista -> que el
  // usuario elija a mano.
  const mostrarSelector = hayVariosPagadores || !cuentaSugerida || !cuentaSeleccionada

  function cerrarYLimpiar() {
    if (guardando) return
    setErrorGuardado('')
    onCerrar()
  }

  async function manejarConfirmar(evento) {
    evento.preventDefault()

    if (!cuentaId) {
      setErrorGuardado(t('tarjetas.eliminar.errorSinCuenta'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    try {
      await onConfirmar(cuentaId)
      cerrarYLimpiar()
    } catch (err) {
      console.error(err)
      setErrorGuardado(
        err?.message === 'TARJETA_DEUDA_NO_CERO'
          ? t('tarjetas.gestion.errorEliminarConDeuda')
          : t('tarjetas.gestion.errorEliminar'),
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('tarjetas.eliminar.cerrarAria')}
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
            <h2 className="text-base font-semibold text-text">
              {t('tarjetas.eliminar.titulo', { nombre: tarjeta.nombre })}
            </h2>
            {!cargandoPagos && !errorPagos && (
              <p className="truncate text-xs text-text-dim">
                {tp('tarjetas.eliminar.resumenGastos', cantidadGastos, {
                  total: formatear(tarjeta.total_gastado ?? 0),
                })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('tarjetas.eliminar.cerrarAria')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {cargandoPagos && (
          <p className="px-1 text-sm text-text-dim">{t('tarjetas.eliminar.cargandoPagos')}</p>
        )}

        {errorPagos && <MensajeError>{t('tarjetas.eliminar.errorCargarPagos')}</MensajeError>}

        {!cargandoPagos && !errorPagos && (
          <>
            {sinCuentas ? (
              <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
                {t('tarjetas.eliminar.sinCuentas')}
              </p>
            ) : mostrarSelector ? (
              <>
                {hayVariosPagadores && (
                  <div className="flex gap-2 rounded-2xl bg-coral/10 px-4 py-3 text-xs text-text">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
                    <span>{t('tarjetas.eliminar.explicacionVariasCuentas')}</span>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs text-text-dim">{t('tarjetas.eliminar.preguntaCuenta')}</p>
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
                          {activo && (
                            <Check className="h-4 w-4 shrink-0 text-mint" strokeWidth={3} aria-hidden="true" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text">
                {t('tarjetas.eliminar.explicacionUnaCuenta', { cuenta: cuentaSeleccionada.nombre })}
              </p>
            )}

            <p className="px-1 text-xs text-text-dim">{t('tarjetas.eliminar.irreversible')}</p>
          </>
        )}

        {errorGuardado && <MensajeError>{errorGuardado}</MensajeError>}

        <button
          type="submit"
          disabled={guardando || cargandoPagos || errorPagos || sinCuentas || !cuentaId}
          className="mt-1 w-full rounded-2xl bg-coral py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? t('tarjetas.eliminar.guardando') : t('tarjetas.eliminar.confirmar')}
        </button>
      </form>
    </div>
  )
}

export default HojaEliminarTarjeta
