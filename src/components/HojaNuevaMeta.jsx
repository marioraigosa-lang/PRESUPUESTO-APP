import { useEffect, useState } from 'react'
import { useMoneda } from '../context/MonedaContext'
import { configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'

function mesAnioActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

// Convierte 'YYYY-MM' (lo que da <input type="month">) en la fecha ISO del
// último día de ese mes, que es la que se guarda como fecha_objetivo.
function ultimoDiaDelMes(mesAnio) {
  const [anio, mes] = mesAnio.split('-').map(Number)
  const ultimoDia = new Date(anio, mes, 0).getDate()
  return `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
}

function HojaNuevaMeta({ abierta, onCerrar, onGuardar, onActualizar, metaEditando }) {
  const editando = Boolean(metaEditando)
  const { moneda } = useMoneda()
  const { simbolo, decimales } = configMoneda(moneda)

  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [mesAnioObjetivo, setMesAnioObjetivo] = useState(mesAnioActual())
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (metaEditando) {
      setNombre(metaEditando.nombre)
      setMonto(String(metaEditando.monto_objetivo))
      setMesAnioObjetivo(
        metaEditando.fecha_objetivo ? metaEditando.fecha_objetivo.slice(0, 7) : mesAnioActual(),
      )
    } else {
      setNombre('')
      setMonto('')
      setMesAnioObjetivo(mesAnioActual())
    }
    setError('')
    setErrorGuardado('')
  }, [abierta, metaEditando])

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

  function manejarCambioMonto(evento) {
    setMonto(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  function manejarCambioFecha(evento) {
    setMesAnioObjetivo(evento.target.value)
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!nombre.trim()) {
      setError('Ingresa un nombre para la meta')
      return
    }
    if (!monto || Number(monto) <= 0) {
      setError('Ingresa un monto objetivo mayor a cero')
      return
    }
    if (!mesAnioObjetivo) {
      setError('Elige el mes y año para tu meta')
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const [anioStr] = mesAnioObjetivo.split('-')

    const datos = {
      nombre: nombre.trim(),
      montoObjetivo: Number(monto),
      anio: Number(anioStr),
      fechaObjetivo: ultimoDiaDelMes(mesAnioObjetivo),
    }

    try {
      if (editando) {
        await onActualizar(metaEditando.id, datos)
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

  const montoFormateado = formatearEntradaMonto(monto, moneda)

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
            {editando ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}
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
          <label htmlFor="nombreMeta" className="mb-1 block text-xs text-text-dim">
            Nombre
          </label>
          <input
            id="nombreMeta"
            type="text"
            value={nombre}
            onChange={manejarCambioNombre}
            placeholder="Ej: Meta de ahorro 2026"
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <label htmlFor="montoMeta" className="mb-1 block text-xs text-text-dim">
            Monto objetivo
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="montoMeta"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="0"
              value={montoFormateado}
              onChange={manejarCambioMonto}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim"
            />
          </div>
        </div>

        <div>
          <label htmlFor="fechaMeta" className="mb-1 block text-xs text-text-dim">
            Fecha objetivo (mes y año)
          </label>
          <input
            id="fechaMeta"
            type="month"
            value={mesAnioObjetivo}
            onChange={manejarCambioFecha}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none [color-scheme:dark]"
          />
        </div>

        {error && <p className="text-xs text-coral">{error}</p>}
        {errorGuardado && (
          <p className="text-xs text-coral">No se pudo guardar la meta: {errorGuardado}</p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar meta'}
        </button>
      </form>
    </div>
  )
}

export default HojaNuevaMeta
