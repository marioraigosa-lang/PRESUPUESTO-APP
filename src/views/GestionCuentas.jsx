import { useState } from 'react'
import Interruptor from '../components/Interruptor'
import HojaCuenta from '../components/HojaCuenta'
import { useFormatoMoneda } from '../context/MonedaContext'

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
    const confirmado = window.confirm(
      `¿Eliminar la cuenta "${cuenta.nombre}"? Esta acción no se puede deshacer.`,
    )
    if (!confirmado) return

    setErrorAccion(null)
    setEliminandoId(cuenta.id)
    try {
      await onEliminarCuenta(cuenta)
    } catch (error) {
      setErrorAccion(`No se pudo eliminar la cuenta: ${error.message}`)
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
      setErrorAccion(`No se pudo actualizar la cuenta: ${error.message}`)
    } finally {
      setActualizandoAhorroId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text">Gestionar cuentas</h1>
            <p className="text-xs text-text-dim">Agrega, edita y marca tus cuentas de ahorro</p>
          </div>
        </header>

        <button
          type="button"
          onClick={abrirCrear}
          className="w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg"
        >
          + Agregar cuenta
        </button>

        {errorAccion && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorAccion}</p>
        )}

        {cargandoCuentas && <p className="px-2 text-sm text-text-dim">Cargando cuentas...</p>}

        {errorCuentas && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Error al cargar las cuentas: {errorCuentas}
          </p>
        )}

        {!cargandoCuentas && !errorCuentas && cuentas.length === 0 && (
          <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
            Aún no tienes cuentas. Crea la primera con "+ Agregar cuenta".
          </p>
        )}

        <div className="flex flex-col gap-3">
          {cuentas.map((cuenta) => {
            const letraInicial = cuenta.inicial || cuenta.nombre.charAt(0).toUpperCase()

            return (
              <div key={cuenta.id} className="flex flex-col gap-3 rounded-2xl bg-panel p-4">
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
                          Ahorro
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-dim">{cuenta.tipo}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEditar(cuenta)}
                      aria-label={`Editar cuenta ${cuenta.nombre}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => manejarEliminar(cuenta)}
                      disabled={eliminandoId === cuenta.id}
                      aria-label={`Eliminar cuenta ${cuenta.nombre}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-coral disabled:opacity-60"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-text">{formatear(cuenta.saldo)}</p>

                <div className="flex items-center justify-between rounded-2xl bg-panel-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">🐷</span>
                    <span className="text-xs font-medium text-text">
                      Cuenta para fondo de ahorro
                    </span>
                  </div>
                  <Interruptor
                    activo={cuenta.es_ahorro}
                    onCambiar={() => manejarAlternarAhorro(cuenta)}
                    deshabilitado={actualizandoAhorroId === cuenta.id}
                    etiqueta={`Marcar ${cuenta.nombre} como cuenta de ahorro`}
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
