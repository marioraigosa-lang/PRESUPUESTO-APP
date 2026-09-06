import { useState } from 'react'
import { Pencil, Trash2, CreditCard } from 'lucide-react'
import HojaTarjeta from '../components/HojaTarjeta'
import HojaEliminarTarjeta from '../components/HojaEliminarTarjeta'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

// Tolerancia de medio centavo para tratar la deuda calculada como "0"
// (misma que usan services/tarjetas.js y la RPC eliminar_tarjeta_usuario).
const EPSILON_DEUDA = 0.005

function GestionTarjetas({
  tarjetas,
  cuentas = [],
  cargandoTarjetas,
  errorTarjetas,
  movimientosVersion,
  onVolver,
  onAgregarTarjeta,
  onActualizarTarjeta,
  onEliminarTarjeta,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [tarjetaEditando, setTarjetaEditando] = useState(null)
  const [tarjetaEliminando, setTarjetaEliminando] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  function mensajeErrorEliminar(error) {
    return error?.message === 'TARJETA_DEUDA_NO_CERO'
      ? t('tarjetas.gestion.errorEliminarConDeuda')
      : t('tarjetas.gestion.errorEliminar')
  }

  function abrirCrear() {
    setTarjetaEditando(null)
    setHojaAbierta(true)
  }

  function abrirEditar(tarjeta) {
    setTarjetaEditando(tarjeta)
    setHojaAbierta(true)
  }

  function cerrarHoja() {
    setHojaAbierta(false)
    setTarjetaEditando(null)
  }

  async function manejarEliminar(tarjeta) {
    setErrorAccion(null)

    const deuda = tarjeta.deuda ?? 0

    // Ramas 1 y 2: la tarjeta no está saldada -- deuda pendiente (deuda > 0)
    // o saldo a favor (deuda < 0, se pagó de más o se borró a mano un gasto
    // ya pagado). En ninguno de los dos casos se puede borrar; el mismo
    // mensaje cubre ambos. Se avisa sin abrir ningún diálogo.
    if (Math.abs(deuda) >= EPSILON_DEUDA) {
      setErrorAccion(t('tarjetas.gestion.errorEliminarConDeuda'))
      return
    }

    // Rama 3b: deuda 0 y CON gastos -> hay que reasignarlos a una cuenta.
    // Eso se decide/confirma en HojaEliminarTarjeta (calcula desde qué
    // cuentas se pagó la tarjeta).
    if ((tarjeta.cantidad_gastos ?? 0) > 0) {
      setTarjetaEliminando(tarjeta)
      return
    }

    // Rama 3a: deuda 0 y SIN gastos (tarjeta nueva sin usar, o solo con
    // pagos -- que no puede pasar, no se paga una tarjeta sin deuda). Un
    // window.confirm simple y borrado directo, sin cuenta de reasignación.
    const confirmado = window.confirm(t('tarjetas.gestion.confirmarEliminar', { nombre: tarjeta.nombre }))
    if (!confirmado) return

    setEliminandoId(tarjeta.id)
    try {
      await onEliminarTarjeta(tarjeta, null)
    } catch (error) {
      console.error(error)
      setErrorAccion(mensajeErrorEliminar(error))
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={onVolver} ariaLabel={t('tarjetas.gestion.volverAria')} />
          <div>
            <h1 className="text-lg font-semibold text-text">{t('tarjetas.gestion.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('tarjetas.gestion.subtitulo')}</p>
          </div>
        </header>

        <button
          type="button"
          onClick={abrirCrear}
          className="w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg"
        >
          {t('tarjetas.gestion.agregarTarjeta')}
        </button>

        <MensajeError>{errorAccion}</MensajeError>

        {cargandoTarjetas && <p className="px-2 text-sm text-text-dim">{t('tarjetas.gestion.cargando')}</p>}

        {errorTarjetas && <MensajeError>{t('tarjetas.gestion.errorCargar')}</MensajeError>}

        {!cargandoTarjetas && !errorTarjetas && tarjetas.length === 0 && (
          <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">{t('tarjetas.gestion.sinTarjetas')}</p>
        )}

        <div className="flex flex-col gap-3">
          {tarjetas.map((tarjeta) => (
            <div key={tarjeta.id} className="flex flex-col gap-3 rounded-2xl bg-panel shadow-card p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bg"
                  style={{ backgroundColor: tarjeta.color }}
                >
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{tarjeta.nombre}</p>
                  <p className="truncate text-xs text-text-dim">
                    {t('tarjetas.gestion.cupoTotalEtiqueta')}: {formatear(tarjeta.cupo_total)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrirEditar(tarjeta)}
                    aria-label={t('tarjetas.gestion.editarAria', { nombre: tarjeta.nombre })}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => manejarEliminar(tarjeta)}
                    disabled={eliminandoId === tarjeta.id}
                    aria-label={t('tarjetas.gestion.eliminarAria', { nombre: tarjeta.nombre })}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel-2 hover:text-coral disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-panel-2 px-4 py-3">
                <div>
                  <p className="text-xs text-text-dim">{t('tarjetas.gestion.deudaEtiqueta')}</p>
                  <p className={`text-sm font-semibold ${tarjeta.deuda > 0 ? 'text-coral' : 'text-mint'}`}>
                    {formatear(tarjeta.deuda)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-dim">{t('tarjetas.gestion.disponibleEtiqueta')}</p>
                  <p className="text-sm font-semibold text-mint">{formatear(tarjeta.cupo_disponible)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <HojaTarjeta
        abierta={hojaAbierta}
        tarjetaEditando={tarjetaEditando}
        onCerrar={cerrarHoja}
        onGuardar={onAgregarTarjeta}
        onActualizar={onActualizarTarjeta}
      />

      <HojaEliminarTarjeta
        abierta={Boolean(tarjetaEliminando)}
        tarjeta={tarjetaEliminando}
        cuentas={cuentas}
        movimientosVersion={movimientosVersion}
        onCerrar={() => setTarjetaEliminando(null)}
        onConfirmar={(cuentaDestinoId) => onEliminarTarjeta(tarjetaEliminando, cuentaDestinoId)}
      />
    </main>
  )
}

export default GestionTarjetas
