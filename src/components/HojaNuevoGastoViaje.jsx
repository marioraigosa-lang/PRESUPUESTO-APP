import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { MONEDA_POR_DEFECTO, MONEDAS, configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import { fechaLocalISO } from '../utils/formatoFecha'
import AyudaContextual from './AyudaContextual'
import MensajeError from './ui/MensajeError'

// A diferencia de HojaNuevoMovimiento (gastos reales), cada gasto de viaje
// tiene su PROPIA moneda -- no usa useMoneda() del perfil -- porque un mismo
// viaje puede tener gastos en distintas monedas (ej. tiquetes en USD, comida
// en COP). La fecha es libre: no se restringe al rango del viaje (ver
// HojaNuevoViaje), porque un gasto puede registrarse antes o después de esas
// fechas (ej. la reserva del hotel, pagada con semanas de anticipación).
function HojaNuevoGastoViaje({ abierta, onCerrar, onGuardar, onActualizar, gastoEditando, categorias }) {
  const editando = Boolean(gastoEditando)
  const { t } = useIdioma()

  const [categoriaId, setCategoriaId] = useState('')
  const [fecha, setFecha] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState(MONEDA_POR_DEFECTO)
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (gastoEditando) {
      setCategoriaId(gastoEditando.categoria_viaje_id ?? '')
      setFecha(gastoEditando.fecha ?? fechaLocalISO())
      setMonto(gastoEditando.monto != null ? String(gastoEditando.monto) : '')
      setMoneda(gastoEditando.moneda || MONEDA_POR_DEFECTO)
      setDescripcion(gastoEditando.descripcion ?? '')
    } else {
      setCategoriaId(categorias[0]?.id ?? '')
      setFecha(fechaLocalISO())
      setMonto('')
      setMoneda(MONEDA_POR_DEFECTO)
      setDescripcion('')
    }
    setError('')
    setErrorGuardado('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, gastoEditando])

  if (!abierta) return null

  const { simbolo, decimales } = configMoneda(moneda)

  function cerrarYLimpiar() {
    setError('')
    setErrorGuardado('')
    onCerrar()
  }

  function manejarCambioMonto(evento) {
    setMonto(limpiarEntradaMonto(evento.target.value, moneda))
    setError('')
  }

  function manejarCambioMoneda(codigo) {
    // Al cambiar de moneda se reinterpreta lo ya escrito con las reglas de
    // separadores de la nueva moneda (mismo criterio que
    // HojaNuevaCategoriaViaje), para no dejar un string canónico inválido.
    setMonto((actual) => limpiarEntradaMonto(formatearEntradaMonto(actual, moneda), codigo))
    setMoneda(codigo)
    setError('')
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    if (!categoriaId) {
      setError(t('viajes.gastoFormulario.errorCategoriaVacia'))
      return
    }
    if (!fecha) {
      setError(t('viajes.gastoFormulario.errorFechaVacia'))
      return
    }
    if (!monto || Number(monto) <= 0) {
      setError(t('viajes.gastoFormulario.errorMontoInvalido'))
      return
    }

    setGuardando(true)
    setErrorGuardado('')

    const datos = {
      categoriaViajeId: categoriaId,
      fecha,
      monto: Number(monto),
      moneda,
      descripcion: descripcion.trim(),
    }

    try {
      if (editando) {
        await onActualizar(gastoEditando.id, datos)
      } else {
        await onGuardar(datos)
      }

      cerrarYLimpiar()
    } catch (err) {
      console.error(err)
      setErrorGuardado(true)
    } finally {
      setGuardando(false)
    }
  }

  const montoFormateado = formatearEntradaMonto(monto, moneda)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t('viajes.gastoFormulario.cerrarAria')}
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
            {editando ? t('viajes.gastoFormulario.editarTitulo') : t('viajes.gastoFormulario.nuevoTitulo')}
          </h2>
          <button
            type="button"
            onClick={cerrarYLimpiar}
            aria-label={t('viajes.gastoFormulario.cerrarAria')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {categorias.length === 0 ? (
          <p className="text-xs text-coral">{t('viajes.gastoFormulario.sinCategoriasDisponibles')}</p>
        ) : (
          <div>
            <p className="mb-1 text-xs text-text-dim">{t('viajes.gastoFormulario.categoriaLabel')}</p>
            <div className="grid grid-cols-3 gap-2">
              {categorias.map((categoria) => {
                const activo = categoria.id === categoriaId
                return (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => {
                      setCategoriaId(categoria.id)
                      setError('')
                    }}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-medium transition-colors ${
                      activo ? 'bg-mint text-bg' : 'bg-panel-2 text-text-dim'
                    }`}
                  >
                    <span className="text-lg">{categoria.emoji}</span>
                    <span className="truncate">{categoria.nombre}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="fechaGastoViaje" className="mb-1 block text-xs text-text-dim">
            {t('viajes.gastoFormulario.fechaLabel')}
          </label>
          <input
            id="fechaGastoViaje"
            type="date"
            value={fecha}
            onChange={(evento) => {
              setFecha(evento.target.value)
              setError('')
            }}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none [color-scheme:dark]"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <p className="text-xs text-text-dim">{t('viajes.gastoFormulario.monedaLabel')}</p>
            <AyudaContextual
              clave="guia.ayuda.viajeGastoMoneda"
              etiqueta={t('guia.ayuda.viajeGastoMonedaAria')}
            />
          </div>
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
          <label htmlFor="montoGastoViaje" className="mb-1 block text-xs text-text-dim">
            {t('viajes.gastoFormulario.montoLabel')}
          </label>
          <div className="flex items-center gap-2 rounded-2xl bg-panel-2 px-4 py-3">
            <span className="text-2xl font-semibold text-text-dim">{simbolo}</span>
            <input
              id="montoGastoViaje"
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
          <label htmlFor="descripcionGastoViaje" className="mb-1 block text-xs text-text-dim">
            {t('viajes.gastoFormulario.descripcionLabel')}
          </label>
          <input
            id="descripcionGastoViaje"
            type="text"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            placeholder={t('viajes.gastoFormulario.descripcionPlaceholder')}
            className="w-full rounded-2xl bg-panel-2 px-4 py-3 text-sm text-text outline-none placeholder:text-text-dim"
          />
        </div>

        <MensajeError>{error}</MensajeError>
        {errorGuardado && <MensajeError>{t('viajes.gastoFormulario.errorGuardar')}</MensajeError>}

        <button
          type="submit"
          disabled={guardando || categorias.length === 0}
          className="mt-1 w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg disabled:opacity-60"
        >
          {guardando
            ? t('viajes.gastoFormulario.guardando')
            : editando
              ? t('viajes.gastoFormulario.guardarCambios')
              : t('viajes.gastoFormulario.guardarGasto')}
        </button>
      </form>
    </div>
  )
}

export default HojaNuevoGastoViaje
