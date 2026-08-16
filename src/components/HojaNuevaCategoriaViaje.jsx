import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { MONEDA_POR_DEFECTO, MONEDAS, configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import AyudaContextual from './AyudaContextual'
import MensajeError from './ui/MensajeError'

const EMOJIS_SUGERIDOS = ['🎟️', '🚗', '🛍️', '🏖️', '📷', '🎒', '⛱️', '🍹']

// A diferencia de HojaCategoria (categorías reales de la app), cada
// categoría de viaje tiene su PROPIA moneda -- no usa useMoneda() del
// perfil -- porque un mismo viaje puede tener categorías en distintas
// monedas (ej. tiquetes en USD, comida en COP).
function HojaNuevaCategoriaViaje({ abierta, onCerrar, onGuardar, onActualizar, categoriaEditando }) {
  const editando = Boolean(categoriaEditando)
  const { t } = useIdioma()

  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS_SUGERIDOS[0])
  const [presupuesto, setPresupuesto] = useState('')
  const [moneda, setMoneda] = useState(MONEDA_POR_DEFECTO)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (categoriaEditando) {
      setNombre(categoriaEditando.nombre)
      setEmoji(categoriaEditando.emoji || EMOJIS_SUGERIDOS[0])
      setPresupuesto(categoriaEditando.presupuesto ? String(categoriaEditando.presupuesto) : '')
      setMoneda(categoriaEditando.moneda || MONEDA_POR_DEFECTO)
    } else {
      setNombre('')
      setEmoji(EMOJIS_SUGERIDOS[0])
      setPresupuesto('')
      setMoneda(MONEDA_POR_DEFECTO)
    }
    setError('')
    setErrorGuardado('')
  }, [abierta, categoriaEditando])

  if (!abierta) return null

  const { simbolo, decimales } = configMoneda(moneda)

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

  function manejarCambioMoneda(codigo) {
    // Al cambiar de moneda se reinterpreta lo ya escrito con las reglas de
    // separadores de la nueva moneda (mismo criterio que limpiarEntradaMonto
    // usa al escribir), para no dejar un string canónico inválido.
    setPresupuesto((actual) => limpiarEntradaMonto(formatearEntradaMonto(actual, moneda), codigo))
    setMoneda(codigo)
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!nombre.trim()) {
      setError(t('viajes.categoriaFormulario.errorNombreVacio'))
      return
    }
    if (!emoji.trim()) {
      setError(t('viajes.categoriaFormulario.errorEmojiVacio'))
      return
    }
    if (presupuesto !== '' && Number(presupuesto) < 0) {
      setError(t('viajes.categoriaFormulario.errorPresupuestoInvalido'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      nombre: nombre.trim(),
      emoji: emoji.trim(),
      presupuesto: presupuesto === '' ? 0 : Number(presupuesto),
      moneda,
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
        aria-label={t('viajes.categoriaFormulario.cerrarAria')}
        onClick={cerrarYLimpiar}
        className="absolute inset-0 animate-[fondo-aparecer_0.2s_ease-out] bg-black/60"
      />

      <form
        onSubmit={manejarGuardar}
        className="relative z-10 flex w-full max-w-[460px] animate-[hoja-subir_0.2s_ease-out] flex-col gap-4 rounded-t-3xl border-t border-line bg-panel shadow-elevated p-5 pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">
            {editando ? t('viajes.categoriaFormulario.editarTitulo') : t('viajes.categoriaFormulario.nuevoTitulo')}
          </h2>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('viajes.categoriaFormulario.cerrarAria')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <label htmlFor="nombreCategoriaViaje" className="mb-1 block text-xs text-text-dim">
            {t('viajes.categoriaFormulario.nombreLabel')}
          </label>
          <input
            id="nombreCategoriaViaje"
            type="text"
            value={nombre}
            onChange={manejarCambioNombre}
            placeholder={t('viajes.categoriaFormulario.nombrePlaceholder')}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">{t('viajes.categoriaFormulario.emojiLabel')}</p>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <input
              type="text"
              value={emoji}
              onChange={manejarCambioEmoji}
              maxLength={4}
              aria-label={t('viajes.categoriaFormulario.emojiLabel')}
              className="w-14 bg-transparent text-center text-2xl text-text outline-none"
            />
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
          <p className="mb-1 block text-xs text-text-dim">{t('viajes.categoriaFormulario.monedaLabel')}</p>
          <div className="flex gap-2 rounded-full bg-panel-2 p-1">
            {Object.values(MONEDAS).map((opcion) => (
              <button
                key={opcion.codigo}
                type="button"
                onClick={() => manejarCambioMoneda(opcion.codigo)}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                  moneda === opcion.codigo ? 'bg-mint text-bg' : 'text-text-dim'
                }`}
              >
                {opcion.codigo}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <label htmlFor="presupuestoCategoriaViaje" className="text-xs text-text-dim">
              {t('viajes.categoriaFormulario.presupuestoLabel')}
            </label>
            <AyudaContextual
              clave="guia.ayuda.viajeCategoriaPresupuesto"
              etiqueta={t('guia.ayuda.viajeCategoriaPresupuestoAria')}
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="presupuestoCategoriaViaje"
              type="text"
              inputMode={decimales > 0 ? 'decimal' : 'numeric'}
              placeholder="0"
              value={presupuestoFormateado}
              onChange={manejarCambioPresupuesto}
              className="w-full bg-transparent text-2xl font-semibold text-text outline-none placeholder:text-text-dim"
            />
          </div>
        </div>

        <MensajeError>{error}</MensajeError>
        {errorGuardado && (
          <MensajeError>
            {t('viajes.categoriaFormulario.errorGuardar')}
            {errorGuardado}
          </MensajeError>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando
            ? t('viajes.categoriaFormulario.guardando')
            : editando
              ? t('viajes.categoriaFormulario.guardarCambios')
              : t('viajes.categoriaFormulario.guardarCategoria')}
        </button>
      </form>
    </div>
  )
}

export default HojaNuevaCategoriaViaje
