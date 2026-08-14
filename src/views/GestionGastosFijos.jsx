import { useState } from 'react'
import HojaGastoFijo from '../components/HojaGastoFijo'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'

function GestionGastosFijos({
  onVolver,
  onAgregarGastoFijo,
  onActualizarGastoFijo,
  onEliminarGastoFijo,
}) {
  const { seleccionarPropio } = useDatosUsuario()
  const formatear = useFormatoMoneda()
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  function ordenarPorDia(lista) {
    return [...lista].sort((a, b) => (a.dia_pago ?? 32) - (b.dia_pago ?? 32))
  }

  async function cargarGastosFijos() {
    const { data, error } = await seleccionarPropio('gastos_fijos').order('dia_pago', {
      ascending: true,
    })

    if (error) throw new Error(error.message)

    return data
  }

  const {
    datos: gastos,
    cargando: cargandoGastos,
    error: errorGastos,
    establecerDatos: setGastos,
  } = useConsulta(cargarGastosFijos, [], [])

  function abrirCrear() {
    setGastoEditando(null)
    setHojaAbierta(true)
  }

  function abrirEditar(gasto) {
    setGastoEditando(gasto)
    setHojaAbierta(true)
  }

  function cerrarHoja() {
    setHojaAbierta(false)
    setGastoEditando(null)
  }

  async function manejarCrear(datos) {
    const nuevo = await onAgregarGastoFijo(datos)
    setGastos((actuales) => ordenarPorDia([...actuales, nuevo]))
  }

  async function manejarActualizar(gasto, datos) {
    const actualizado = await onActualizarGastoFijo(gasto, datos)
    setGastos((actuales) => ordenarPorDia(actuales.map((g) => (g.id === gasto.id ? actualizado : g))))
  }

  async function manejarEliminar(gasto) {
    const confirmado = window.confirm(
      gasto.pagado
        ? `"${gasto.nombre}" ya está pagado. Al eliminarlo se devolverá ${formatear(gasto.monto)} a la cuenta y se borrará el movimiento vinculado. Esta acción no se puede deshacer. ¿Continuar?`
        : `¿Eliminar el gasto fijo "${gasto.nombre}"? Esta acción no se puede deshacer.`,
    )
    if (!confirmado) return

    setErrorAccion(null)
    setEliminandoId(gasto.id)
    try {
      await onEliminarGastoFijo(gasto)
      setGastos((actuales) => actuales.filter((g) => g.id !== gasto.id))
    } catch (error) {
      setErrorAccion(`No se pudo eliminar el gasto fijo: ${error.message}`)
    } finally {
      setEliminandoId(null)
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
            <h1 className="text-lg font-semibold text-text">Gestionar gastos fijos</h1>
            <p className="text-xs text-text-dim">Crea, edita y elimina tus gastos fijos</p>
          </div>
        </header>

        <button
          type="button"
          onClick={abrirCrear}
          className="w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg"
        >
          + Agregar gasto fijo
        </button>

        {errorAccion && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorAccion}</p>
        )}

        {cargandoGastos && <p className="px-2 text-sm text-text-dim">Cargando gastos fijos...</p>}

        {errorGastos && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Error al cargar los gastos fijos: {errorGastos}
          </p>
        )}

        {!cargandoGastos && !errorGastos && gastos.length === 0 && (
          <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
            Aún no tienes gastos fijos. Crea el primero con "+ Agregar gasto fijo".
          </p>
        )}

        <div className="flex flex-col gap-3">
          {gastos.map((gasto) => (
            <div key={gasto.id} className="flex items-center gap-3 rounded-2xl bg-panel p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text">{gasto.nombre}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      gasto.pagado ? 'bg-mint/10 text-mint' : 'bg-line text-text-dim'
                    }`}
                  >
                    {gasto.pagado ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
                <p className="truncate text-xs text-text-dim">
                  {gasto.dia_pago ? `Vence día ${gasto.dia_pago}` : 'Sin fecha'} · {formatear(gasto.monto)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => abrirEditar(gasto)}
                  aria-label={`Editar gasto fijo ${gasto.nombre}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => manejarEliminar(gasto)}
                  disabled={eliminandoId === gasto.id}
                  aria-label={`Eliminar gasto fijo ${gasto.nombre}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-coral disabled:opacity-60"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <HojaGastoFijo
        abierta={hojaAbierta}
        gastoEditando={gastoEditando}
        onCerrar={cerrarHoja}
        onGuardar={manejarCrear}
        onActualizar={manejarActualizar}
      />
    </main>
  )
}

export default GestionGastosFijos
