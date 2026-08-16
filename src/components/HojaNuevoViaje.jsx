import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import AyudaContextual from './AyudaContextual'
import MensajeError from './ui/MensajeError'

function HojaNuevoViaje({ abierta, onCerrar, onGuardar, onActualizar, viajeEditando }) {
  const editando = Boolean(viajeEditando)
  const { t } = useIdioma()

  const [nombre, setNombre] = useState('')
  const [adultos, setAdultos] = useState('1')
  const [ninos, setNinos] = useState('0')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  // Precarga el formulario cuando se abre para editar, o lo limpia cuando se
  // abre para crear uno nuevo (mismo patrón que HojaNuevoMovimiento /
  // HojaNuevaMeta).
  useEffect(() => {
    if (!abierta) return

    if (viajeEditando) {
      setNombre(viajeEditando.nombre)
      setAdultos(String(viajeEditando.adultos))
      setNinos(String(viajeEditando.ninos))
      setFechaDesde(viajeEditando.fecha_desde ?? '')
      setFechaHasta(viajeEditando.fecha_hasta ?? '')
      setOrigen(viajeEditando.origen ?? '')
      setDestino(viajeEditando.destino ?? '')
    } else {
      setNombre('')
      setAdultos('1')
      setNinos('0')
      setFechaDesde('')
      setFechaHasta('')
      setOrigen('')
      setDestino('')
    }
    setError('')
    setErrorGuardado('')
  }, [abierta, viajeEditando])

  if (!abierta) return null

  function cerrarYLimpiar() {
    setError('')
    setErrorGuardado('')
    onCerrar()
  }

  function manejarCambio(setter) {
    return (evento) => {
      setter(evento.target.value)
      setError('')
    }
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!nombre.trim()) {
      setError(t('viajes.formulario.errorNombreVacio'))
      return
    }

    const adultosNum = Number(adultos)
    if (!Number.isFinite(adultosNum) || adultosNum < 1) {
      setError(t('viajes.formulario.errorAdultosMinimo'))
      return
    }

    const ninosNum = Number(ninos)
    if (!Number.isFinite(ninosNum) || ninosNum < 0) {
      setError(t('viajes.formulario.errorNinosInvalido'))
      return
    }

    if (fechaDesde && fechaHasta && fechaHasta < fechaDesde) {
      setError(t('viajes.formulario.errorFechaInvalida'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      nombre,
      adultos: adultosNum,
      ninos: ninosNum,
      fechaDesde: fechaDesde || null,
      fechaHasta: fechaHasta || null,
      origen,
      destino,
    }

    try {
      if (editando) {
        await onActualizar(datos)
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

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('viajes.formulario.cerrarAria')}
        onClick={cerrarYLimpiar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarGuardar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel shadow-elevated p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-text">
              {editando ? t('viajes.formulario.editarTitulo') : t('viajes.formulario.nuevoTitulo')}
            </h2>
            <AyudaContextual
              clave="guia.ayuda.viajeEspacioAparte"
              etiqueta={t('guia.ayuda.viajeEspacioAparteAria')}
            />
          </div>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('viajes.formulario.cerrarAria')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label htmlFor="nombreViaje" className="mb-1 block text-xs text-text-dim">
            {t('viajes.formulario.nombreLabel')}
          </label>
          <input
            id="nombreViaje"
            type="text"
            value={nombre}
            onChange={manejarCambio(setNombre)}
            placeholder={t('viajes.formulario.nombrePlaceholder')}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="adultosViaje" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.adultosLabel')}
            </label>
            <input
              id="adultosViaje"
              type="number"
              inputMode="numeric"
              min="1"
              value={adultos}
              onChange={manejarCambio(setAdultos)}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
            />
          </div>
          <div>
            <label htmlFor="ninosViaje" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.ninosLabel')}
            </label>
            <input
              id="ninosViaje"
              type="number"
              inputMode="numeric"
              min="0"
              value={ninos}
              onChange={manejarCambio(setNinos)}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fechaDesdeViaje" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.fechaDesdeLabel')}
            </label>
            <input
              id="fechaDesdeViaje"
              type="date"
              value={fechaDesde}
              onChange={manejarCambio(setFechaDesde)}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label htmlFor="fechaHastaViaje" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.fechaHastaLabel')}
            </label>
            <input
              id="fechaHastaViaje"
              type="date"
              value={fechaHasta}
              onChange={manejarCambio(setFechaHasta)}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="origenViaje" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.origenLabel')}
            </label>
            <input
              id="origenViaje"
              type="text"
              value={origen}
              onChange={manejarCambio(setOrigen)}
              placeholder={t('viajes.formulario.origenPlaceholder')}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </div>
          <div>
            <label htmlFor="destinoViaje" className="mb-1 block text-xs text-text-dim">
              {t('viajes.formulario.destinoLabel')}
            </label>
            <input
              id="destinoViaje"
              type="text"
              value={destino}
              onChange={manejarCambio(setDestino)}
              placeholder={t('viajes.formulario.destinoPlaceholder')}
              className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
            />
          </div>
        </div>

        <MensajeError>{error}</MensajeError>
        {errorGuardado && (
          <MensajeError>
            {t('viajes.formulario.errorGuardar')}
            {errorGuardado}
          </MensajeError>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando
            ? t('viajes.formulario.guardando')
            : editando
              ? t('viajes.formulario.guardarCambios')
              : t('viajes.formulario.guardarViaje')}
        </button>
      </form>
    </div>
  )
}

export default HojaNuevoViaje
