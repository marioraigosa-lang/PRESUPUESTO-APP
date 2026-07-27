import { useEffect, useState } from 'react'

function HojaReasignarCategoria({
  abierta,
  onCerrar,
  categorias,
  categoria,
  cantidadMovimientos,
  onConfirmar,
}) {
  const [categoriaDestinoId, setCategoriaDestinoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  const opciones = categorias.filter((c) => c.id !== categoria?.id)

  useEffect(() => {
    if (!abierta) return
    setCategoriaDestinoId(opciones[0]?.id ?? '')
    setErrorGuardado('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, categoria])

  if (!abierta || !categoria) return null

  function cerrarYLimpiar() {
    if (guardando) return
    setErrorGuardado('')
    onCerrar()
  }

  async function manejarConfirmar(evento) {
    evento.preventDefault()

    if (!categoriaDestinoId) {
      setErrorGuardado('Selecciona una categoría destino')
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    try {
      await onConfirmar(categoriaDestinoId)
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
        aria-label="Cerrar"
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
            <h2 className="text-base font-semibold text-text">Mover gastos y eliminar</h2>
            <p className="truncate text-xs text-text-dim">
              "{categoria.nombre}" tiene {cantidadMovimientos}{' '}
              {cantidadMovimientos === 1 ? 'movimiento' : 'movimientos'}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label="Cerrar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-text-dim">
          Para eliminar "{categoria.nombre}" primero elige a qué categoría se mueven sus gastos.
        </p>

        <div>
          <p className="mb-1 text-xs text-text-dim">Mover gastos a</p>

          {opciones.length === 0 ? (
            <p className="rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text-dim">
              No tienes otra categoría disponible. Crea una primero.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {opciones.map((opcion) => {
                const activo = opcion.id === categoriaDestinoId
                return (
                  <button
                    key={opcion.id}
                    type="button"
                    onClick={() => setCategoriaDestinoId(opcion.id)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      activo ? 'bg-mint/15 ring-1 ring-mint' : 'bg-panel-2'
                    }`}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: `${opcion.color}26` }}
                    >
                      {opcion.emoji}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                      {opcion.nombre}
                    </p>
                    {activo && <span className="shrink-0 text-sm font-semibold text-mint">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {errorGuardado && (
          <p className="text-xs text-coral">No se pudo completar la acción: {errorGuardado}</p>
        )}

        <button
          type="submit"
          disabled={guardando || !categoriaDestinoId}
          className="mt-1 w-full rounded-2xl bg-coral py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? 'Moviendo y eliminando...' : 'Mover gastos y eliminar categoría'}
        </button>
      </form>
    </div>
  )
}

export default HojaReasignarCategoria
