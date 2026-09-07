import { useState } from 'react'
import { Pencil, Archive, CreditCard } from 'lucide-react'
import HojaTarjeta from '../components/HojaTarjeta'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

// Tolerancia de medio centavo para tratar la deuda calculada como "0" (misma
// que usan services/tarjetas.js y la vista tarjetas_con_deuda).
const EPSILON_DEUDA = 0.005

function GestionTarjetas({
  tarjetas,
  cargandoTarjetas,
  errorTarjetas,
  onVolver,
  onAgregarTarjeta,
  onActualizarTarjeta,
  onArchivarTarjeta,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [tarjetaEditando, setTarjetaEditando] = useState(null)
  const [archivandoId, setArchivandoId] = useState(null)
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

  async function manejarArchivar(tarjeta) {
    setErrorAccion(null)

    // La tarjeta no está saldada -- deuda pendiente (deuda > 0) o saldo a
    // favor (deuda < 0, se pagó de más o se borró a mano un gasto ya pagado).
    // En ninguno de los dos casos se puede archivar; el mismo mensaje cubre
    // ambos. Se avisa sin abrir ningún diálogo.
    if (Math.abs(tarjeta.deuda ?? 0) >= EPSILON_DEUDA) {
      setErrorAccion(t('tarjetas.gestion.errorArchivarConDeuda'))
      return
    }

    // Deuda 0: confirmación simple. Archivar no borra nada -- el texto lo
    // deja claro ("su historial se conserva").
    const confirmado = window.confirm(t('tarjetas.gestion.confirmarArchivar', { nombre: tarjeta.nombre }))
    if (!confirmado) return

    setArchivandoId(tarjeta.id)
    try {
      await onArchivarTarjeta(tarjeta)
    } catch (error) {
      console.error(error)
      setErrorAccion(
        error?.message === 'TARJETA_DEUDA_NO_CERO'
          ? t('tarjetas.gestion.errorArchivarConDeuda')
          : t('tarjetas.gestion.errorArchivar'),
      )
    } finally {
      setArchivandoId(null)
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
                    onClick={() => manejarArchivar(tarjeta)}
                    disabled={archivandoId === tarjeta.id}
                    aria-label={t('tarjetas.gestion.archivarAria', { nombre: tarjeta.nombre })}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-gold disabled:opacity-60"
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
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
