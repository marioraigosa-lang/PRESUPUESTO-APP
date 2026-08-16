import { useState } from 'react'
import { Pencil, Trash2, PiggyBank } from 'lucide-react'
import Interruptor from '../components/Interruptor'
import HojaCuenta from '../components/HojaCuenta'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

function GestionCuentas({
  cuentas,
  cargandoCuentas,
  errorCuentas,
  onVolver,
  onAgregarCuenta,
  onActualizarCuenta,
  onEliminarCuenta,
  onAlternarEsAhorro,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [cuentaEditando, setCuentaEditando] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [actualizandoAhorroId, setActualizandoAhorroId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  function abrirCrear() {
    setCuentaEditando(null)
    setHojaAbierta(true)
  }

  function abrirEditar(cuenta) {
    setCuentaEditando(cuenta)
    setHojaAbierta(true)
  }

  function cerrarHoja() {
    setHojaAbierta(false)
    setCuentaEditando(null)
  }

  async function manejarEliminar(cuenta) {
    const confirmado = window.confirm(t('cuentas.gestion.confirmarEliminar', { nombre: cuenta.nombre }))
    if (!confirmado) return

    setErrorAccion(null)
    setEliminandoId(cuenta.id)
    try {
      await onEliminarCuenta(cuenta)
    } catch (error) {
      setErrorAccion(t('cuentas.gestion.errorEliminar') + error.message)
    } finally {
      setEliminandoId(null)
    }
  }

  async function manejarAlternarAhorro(cuenta) {
    setErrorAccion(null)
    setActualizandoAhorroId(cuenta.id)
    try {
      await onAlternarEsAhorro(cuenta)
    } catch (error) {
      setErrorAccion(t('cuentas.gestion.errorActualizar') + error.message)
    } finally {
      setActualizandoAhorroId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={onVolver} ariaLabel={t('cuentas.gestion.volverAria')} />
          <div>
            <h1 className="text-lg font-semibold text-text">{t('cuentas.gestion.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('cuentas.gestion.subtitulo')}</p>
          </div>
        </header>

        <button
          type="button"
          onClick={abrirCrear}
          className="w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg"
        >
          {t('cuentas.gestion.agregarCuenta')}
        </button>

        <MensajeError>{errorAccion}</MensajeError>

        {cargandoCuentas && <p className="px-2 text-sm text-text-dim">{t('cuentas.gestion.cargando')}</p>}

        {errorCuentas && (
          <MensajeError>
            {t('cuentas.gestion.errorCargar')}
            {errorCuentas}
          </MensajeError>
        )}

        {!cargandoCuentas && !errorCuentas && cuentas.length === 0 && (
          <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">{t('cuentas.gestion.sinCuentas')}</p>
        )}

        <div className="flex flex-col gap-3">
          {cuentas.map((cuenta) => {
            const letraInicial = cuenta.inicial || cuenta.nombre.charAt(0).toUpperCase()

            return (
              <div key={cuenta.id} className="flex flex-col gap-3 rounded-2xl bg-panel shadow-card p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-bg"
                    style={{ backgroundColor: cuenta.color }}
                  >
                    {letraInicial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text">{cuenta.nombre}</p>
                      {cuenta.es_ahorro && (
                        <span className="shrink-0 rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint">
                          {t('cuentas.gestion.badgeAhorro')}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-dim">{cuenta.tipo}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEditar(cuenta)}
                      aria-label={t('cuentas.gestion.editarAria', { nombre: cuenta.nombre })}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => manejarEliminar(cuenta)}
                      disabled={eliminandoId === cuenta.id}
                      aria-label={t('cuentas.gestion.eliminarAria', { nombre: cuenta.nombre })}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel-2 hover:text-coral disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-text">{formatear(cuenta.saldo)}</p>

                <div className="flex items-center justify-between rounded-2xl bg-panel-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-text-dim" aria-hidden="true" />
                    <span className="text-xs font-medium text-text">
                      {t('cuentas.gestion.fondoAhorroLabel')}
                    </span>
                  </div>
                  <Interruptor
                    activo={cuenta.es_ahorro}
                    onCambiar={() => manejarAlternarAhorro(cuenta)}
                    deshabilitado={actualizandoAhorroId === cuenta.id}
                    etiqueta={t('cuentas.gestion.fondoAhorroAria', { nombre: cuenta.nombre })}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <HojaCuenta
        abierta={hojaAbierta}
        cuentaEditando={cuentaEditando}
        onCerrar={cerrarHoja}
        onGuardar={onAgregarCuenta}
        onActualizar={onActualizarCuenta}
      />
    </main>
  )
}

export default GestionCuentas
