import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIdioma } from '../context/IdiomaContext'
import { MONEDA_POR_DEFECTO, MONEDAS, configMoneda } from '../utils/monedas'
import { limpiarEntradaMonto, formatearEntradaMonto } from '../utils/inputMoneda'
import { COLORES_CUENTA } from '../utils/coloresCuenta'
import { resolverIconoCategoria } from '../utils/resolverIconoCategoria'
import IconoCategoria from './IconoCategoria'
import SelectorIcono from './SelectorIcono'
import AyudaContextual from './AyudaContextual'
import MensajeError from './ui/MensajeError'

// Fase VIAJE-B del PLAN-iconos.md: reemplaza el input de emoji + 8
// sugeridas por el mismo <SelectorIcono> + picker de color que ya usa
// HojaCategoria.jsx (categorías reales) desde la Fase B4 -- mismo criterio:
// estado "icono" vacío hasta elegir (nunca arranca con una sugerencia por
// defecto), "color" sí arranca en el primero de la paleta.
//
// A diferencia de HojaCategoria, cada categoría de viaje tiene su PROPIA
// moneda -- no usa useMoneda() del perfil -- porque un mismo viaje puede
// tener categorías en distintas monedas (ej. tiquetes en USD, comida en
// COP).
function HojaNuevaCategoriaViaje({ abierta, onCerrar, onGuardar, onActualizar, categoriaEditando }) {
  const editando = Boolean(categoriaEditando)
  const { t } = useIdioma()

  const [nombre, setNombre] = useState('')
  // '' = todavía no elige ninguno (mismo criterio que HojaCategoria.jsx).
  const [icono, setIcono] = useState('')
  const [color, setColor] = useState(COLORES_CUENTA[0])
  const [presupuesto, setPresupuesto] = useState('')
  const [moneda, setMoneda] = useState(MONEDA_POR_DEFECTO)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')

  useEffect(() => {
    if (!abierta) return

    if (categoriaEditando) {
      setNombre(categoriaEditando.nombre)
      // categoria.icono si ya lo tiene; si no (categoría vieja, sin icono
      // propio todavía), lo deriva de "emoji" con la misma cascada que usa
      // toda la app para mostrarlo (resolverIconoCategoria).
      setIcono(resolverIconoCategoria(categoriaEditando))
      setColor(categoriaEditando.color || COLORES_CUENTA[0])
      setPresupuesto(categoriaEditando.presupuesto ? String(categoriaEditando.presupuesto) : '')
      setMoneda(categoriaEditando.moneda || MONEDA_POR_DEFECTO)
    } else {
      setNombre('')
      setIcono('')
      setColor(COLORES_CUENTA[0])
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

  function manejarCambioIcono(nombreIcono) {
    setIcono(nombreIcono)
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
    if (!icono) {
      setError(t('viajes.categoriaFormulario.errorIconoVacio'))
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
      icono,
      color,
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
      console.error(err)
      setErrorGuardado(true)
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
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs text-text-dim">{t('viajes.categoriaFormulario.iconoLabel')}</p>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}26` }}
              aria-hidden="true"
            >
              <IconoCategoria nombre={icono || 'tag'} color={color} size="sm" />
            </div>
          </div>
          <SelectorIcono valor={icono} onCambiar={manejarCambioIcono} color={color} />
        </div>

        <div>
          <p className="mb-1 text-xs text-text-dim">{t('viajes.categoriaFormulario.colorLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {COLORES_CUENTA.map((opcion) => (
              <button
                key={opcion}
                type="button"
                aria-label={t('viajes.categoriaFormulario.colorAria', { color: opcion })}
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
        {errorGuardado && <MensajeError>{t('viajes.categoriaFormulario.errorGuardar')}</MensajeError>}

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
