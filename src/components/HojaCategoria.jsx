import { useEffect, useState } from 'react'
import { useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'

const COLORES = [
  '#4fd1a5',
  '#f2795b',
  '#e9b949',
  '#5aa9e6',
  '#9b8cf0',
  '#e07ba0',
  '#38bdf8',
  '#94a3b8',
]

const EMOJIS_SUGERIDOS = ['🛒', '⛽', '💊', '🎬', '✨', '🏠', '🍔', '👕', '📚', '🐾', '🎁', '☕']

function HojaCategoria({ abierta, onCerrar, onGuardar, onActualizar, categoriaEditando }) {
  const editando = Boolean(categoriaEditando)
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS_SUGERIDOS[0])
  const [color, setColor] = useState(COLORES[0])
  const [presupuesto, setPresupuesto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (categoriaEditando) {
      setNombre(categoriaEditando.nombre)
      setEmoji(categoriaEditando.emoji || EMOJIS_SUGERIDOS[0])
      setColor(categoriaEditando.color || COLORES[0])
      setPresupuesto(categoriaEditando.presupuesto ? String(categoriaEditando.presupuesto) : '')
      setDescripcion(categoriaEditando.descripcion || '')
    } else {
      setNombre('')
      setEmoji(EMOJIS_SUGERIDOS[0])
      setColor(COLORES[0])
      setPresupuesto('')
      setDescripcion('')
    }
    setError('')
    setErrorGuardado('')
  }, [abierta, categoriaEditando])

  if (!abierta) return null

  function cerrarYLimpiar() {
    setError('')
    setErrorGuardado('')
    onCerrar()
  }

  function manejarCambioNombre(evento) {
    setNombre(evento.target.value)
    setError('')
  }

  function manejarCambioEmoji(evento) {
    setEmoji(evento.target.value)
    setError('')
  }

  function manejarCambioPresupuesto(evento) {
    setPresupuesto(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!nombre.trim()) {
      setError('Ingresa un nombre para la categoría')
      return
    }
    if (!emoji.trim()) {
      setError('Elige un emoji')
      return
    }
    if (presupuesto !== '' && Number(presupuesto) < 0) {
      setError('El tope mensual no puede ser negativo')
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      nombre: nombre.trim(),
      emoji: emoji.trim(),
      color,
      presupuesto: presupuesto === '' ? 0 : Number(presupuesto),
      descripcion: descripcion.trim() || null,
    }

    try {
      if (editando) {
        await onActualizar(categoriaEditando.id, datos)
      } else {
        await onGuardar(datos)
      }

      cerrarYLimpiar()
    } catch (err) {
      setErrorGuardado(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const presupuestoFormateado = formatearEntradaMonto(presupuesto, moneda)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={cerrarYLimpiar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarGuardar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">
            {editando ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ×
          </button>
        </div>

        <div>
          <label htmlFor="nombreCategoria" className="mb-1 block text-xs text-text-dim">
            Nombre
          </label>
          <input
            id="nombreCategoria"
            type="text"
            value={nombre}
            onChange={manejarCambioNombre}
            placeholder="Ej: Mercado"
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">Emoji</p>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <input
              type="text"
              value={emoji}
              onChange={manejarCambioEmoji}
              maxLength={4}
              aria-label="Emoji de la categoría"
              className="w-14 bg-transparent text-center text-2xl text-text outline-none"
            />
            <span className="text-xs text-text-dim">Escribe uno o elige abajo</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {EMOJIS_SUGERIDOS.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setEmoji(opcion)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-colors ${
                  emoji === opcion ? 'bg-mint/20 ring-1 ring-mint' : 'bg-panel-2'
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLORES.map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-label={`Color ${opcion}`}
                onClick={() => setColor(opcion)}
                className={`h-8 w-8 rounded-full transition-shadow ${
                  color === opcion ? 'ring-2 ring-text ring-offset-2 ring-offset-panel' : ''
                }`}
                style={{ backgroundColor: opcion }}
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="presupuestoCategoria" className="mb-1 block text-xs text-text-dim">
            Tope mensual (opcional)
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="presupuestoCategoria"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="Sin tope"
              value={presupuestoFormateado}
              onChange={manejarCambioPresupuesto}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim"
            />
          </div>
          <p className="mt-1 text-xs text-text-dim">
            Déjalo vacío si no quieres ponerle un tope a esta categoría; solo se mostrará el total gastado.
          </p>
        </div>

        <div>
          <label htmlFor="descripcionCategoria" className="mb-1 block text-xs text-text-dim">
            Descripción (opcional)
          </label>
          <input
            id="descripcionCategoria"
            type="text"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            placeholder="Ej: Café, snacks, propinas..."
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
          <p className="mt-1 text-xs text-text-dim">
            Un texto de ayuda corto que se muestra debajo del nombre de la categoría.
          </p>
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}
        {errorGuardado && (
          <p className="text-xs text-coral">No se pudo guardar la categoría: {errorGuardado}</p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar categoría'}
        </button>
      </form>
    </div>
  )
}

export default HojaCategoria
