import { useState } from 'react'
import { Pencil, Trash2, CreditCard } from 'lucide-react'
import HojaTarjeta from '../components/HojaTarjeta'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

function GestionTarjetas({
  tarjetas,
  cargandoTarjetas,
  errorTarjetas,
  onVolver,
  onAgregarTarjeta,
  onActualizarTarjeta,
  onEliminarTarjeta,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [tarjetaEditando, setTarjetaEditando] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

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
    // Bloqueo de UI: si ya sabemos que services/tarjetas.js va a rechazar el
    // borrado (deuda > 0), no tiene sentido mostrar un diálogo de
    // confirmación para una acción que va a fallar -- se avisa el motivo de
    // una vez, sin un paso intermedio que no lleva a ningún lado.
    if (tarjeta.deuda > 0) {
      setErrorAccion(t('tarjetas.gestion.errorEliminarConDeuda'))
      return
    }

    const confirmado = window.confirm(t('tarjetas.gestion.confirmarEliminar', { nombre: tarjeta.nombre }))
    if (!confirmado) return

    setErrorAccion(null)
    setEliminandoId(tarjeta.id)
    try {
      await onEliminarTarjeta(tarjeta)
    } catch (error) {
      console.error(error)
      setErrorAccion(t('tarjetas.gestion.errorEliminar'))
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
    </main>
  )
}

export default GestionTarjetas
