import { useState } from 'react'
import { Plane, Calendar, Users, ArrowRight, Tag, ChevronRight } from 'lucide-react'
import TarjetaCategoriaViaje from '../components/TarjetaCategoriaViaje'
import HojaNuevaCategoriaViaje from '../components/HojaNuevaCategoriaViaje'
import HojaNuevoGastoViaje from '../components/HojaNuevoGastoViaje'
import AsistenteGastoViaje from '../components/asistente-gasto-viaje/AsistenteGastoViaje'
import BotonAgregar from '../components/BotonAgregar'
import DetalleCategoriaViaje from './DetalleCategoriaViaje'
import AyudaContextual from '../components/AyudaContextual'
import { textoFechas } from '../components/TarjetaViaje'
import { useIdioma } from '../context/IdiomaContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import * as categoriasViajeService from '../services/categoriasViaje'
import * as gastosViajeService from '../services/gastosViaje'
import { formatearMonto } from '../utils/formatoMoneda'
import { gastosSinCategoria, totalesPorMoneda } from '../utils/resumenViaje'
import { USAR_ASISTENTE_GASTO_VIAJE } from '../utils/flags'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'
import Tarjeta from '../components/ui/Tarjeta'

const DATOS_INICIALES = { categorias: [], gastos: [] }

// Pantalla autosuficiente, igual que Viajes.jsx: carga sus propias
// categorías y gastos con useDatosUsuario + useConsulta (en una sola
// consulta con Promise.all, para compartir un mismo cargando/error). Recibe
// el "viaje" y "onVolver" de Viajes.jsx, que es quien controla la
// navegación lista/detalle (Fase 2 de "Planifica tus viajes").
//
// Fase VIAJE-C: "categorías navegables" -- ya no hay una lista plana de
// TODOS los gastos del viaje debajo de las categorías. Tocar una categoría
// (o la tarjeta especial "sin categoría") abre DetalleCategoriaViaje.jsx con
// SU subconjunto de gastos, mismo patrón "modo" que Viajes.jsx usa para
// entrar/salir de esta misma pantalla. Como categorías + gastos ya están
// completos en memoria (cargarDatosViaje, abajo), el subconjunto se arma
// filtrando en cliente -- no hace falta una consulta nueva.
function DetalleViaje({ viaje, onVolver, onVerResumen }) {
  const datosUsuario = useDatosUsuario()
  const { seleccionarPropio } = datosUsuario
  const { idioma, t, tp } = useIdioma()

  const [hojaCategoriaAbierta, setHojaCategoriaAbierta] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [eliminandoCategoriaId, setEliminandoCategoriaId] = useState(null)
  const [errorEliminarCategoria, setErrorEliminarCategoria] = useState(null)

  // null = mostrando la lista de categorías; { categoria } = mostrando el
  // detalle de una categoría real; { categoria: null } = mostrando los
  // gastos huérfanos ("sin categoría").
  const [detalleCategoria, setDetalleCategoria] = useState(null)

  // FAB flotante (mismo estilo que el "+" de Home, ver BotonAgregar.jsx):
  // registra un gasto SIN preseleccionar categoría -- a diferencia de
  // "+ Agregar gasto" dentro de DetalleCategoriaViaje.jsx, que sí la
  // preselecciona. Solo se muestra en esta pantalla (la lista de categorías
  // del viaje), nunca dentro del detalle de una categoría -- ver el `return`
  // anticipado de abajo.
  const [gastoRapidoAbierto, setGastoRapidoAbierto] = useState(false)

  async function cargarDatosViaje() {
    const [categoriasResultado, gastosResultado] = await Promise.all([
      seleccionarPropio('categorias_viaje', '*').eq('viaje_id', viaje.id).order('creado_en', { ascending: true }),
      seleccionarPropio('gastos_viaje', '*')
        .eq('viaje_id', viaje.id)
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false }),
    ])

    if (categoriasResultado.error) throw new Error(categoriasResultado.error.message)
    if (gastosResultado.error) throw new Error(gastosResultado.error.message)

    return { categorias: categoriasResultado.data, gastos: gastosResultado.data }
  }

  const {
    datos: { categorias, gastos },
    cargando,
    error,
    establecerDatos: setDatosViaje,
  } = useConsulta(cargarDatosViaje, [viaje.id], DATOS_INICIALES)

  function actualizarCategorias(actualizador) {
    setDatosViaje((actual) => ({
      ...actual,
      categorias: typeof actualizador === 'function' ? actualizador(actual.categorias) : actualizador,
    }))
  }

  function actualizarGastos(actualizador) {
    setDatosViaje((actual) => ({
      ...actual,
      gastos: typeof actualizador === 'function' ? actualizador(actual.gastos) : actualizador,
    }))
  }

  function abrirCrearCategoria() {
    setCategoriaEditando(null)
    setHojaCategoriaAbierta(true)
  }

  function abrirEditarCategoria(categoria) {
    setCategoriaEditando(categoria)
    setHojaCategoriaAbierta(true)
  }

  function cerrarHojaCategoria() {
    setHojaCategoriaAbierta(false)
    setCategoriaEditando(null)
  }

  async function agregarCategoria(datos) {
    const nueva = await categoriasViajeService.agregarCategoriaViaje(datosUsuario, viaje.id, datos)
    actualizarCategorias((actuales) => [...actuales, nueva])
  }

  async function actualizarCategoria(id, datos) {
    const actualizada = await categoriasViajeService.actualizarCategoriaViaje(datosUsuario, id, datos)
    actualizarCategorias((actuales) => actuales.map((c) => (c.id === id ? actualizada : c)))
  }

  async function eliminarCategoria(categoria) {
    const confirmado = window.confirm(
      t('viajes.detalle.confirmarEliminarCategoria', { nombre: categoria.nombre }),
    )
    if (!confirmado) return

    setErrorEliminarCategoria(null)
    setEliminandoCategoriaId(categoria.id)

    try {
      await categoriasViajeService.eliminarCategoriaViaje(datosUsuario, categoria, t)
      actualizarCategorias((actuales) => actuales.filter((c) => c.id !== categoria.id))
    } catch (err) {
      // eliminarCategoriaViaje puede lanzar un mensaje ya traducido y seguro
      // (categoría con gastos registrados) o un error crudo de Supabase; solo
      // el primero es seguro para mostrar tal cual, así que lo distinguimos
      // comparándolo con el texto conocido en vez de mostrar err.message.
      const mensajeCategoriaConGastos = t('viajes.detalle.errorCategoriaConGastos')
      const esErrorConocido = err.message === mensajeCategoriaConGastos
      if (!esErrorConocido) {
        console.error(err)
      }
      setErrorEliminarCategoria(esErrorConocido ? err.message : t('viajes.detalle.errorEliminarCategoria'))
    } finally {
      setEliminandoCategoriaId(null)
    }
  }

  // Mutaciones puras (sin confirm() ni estado de error de UI): eso ahora
  // vive en DetalleCategoriaViaje.jsx, que es quien pinta cada gasto y
  // recibe estas tres funciones tal cual -- mismo criterio que
  // agregarCategoria/actualizarCategoria de arriba, que tampoco manejan UI.
  async function agregarGasto(datos) {
    const nuevo = await gastosViajeService.agregarGastoViaje(datosUsuario, viaje.id, datos)
    actualizarGastos((actuales) => gastosViajeService.ordenarPorFecha([...actuales, nuevo]))
  }

  async function actualizarGasto(id, datos) {
    const actualizado = await gastosViajeService.actualizarGastoViaje(datosUsuario, id, datos)
    actualizarGastos((actuales) =>
      gastosViajeService.ordenarPorFecha(actuales.map((g) => (g.id === id ? actualizado : g))),
    )
  }

  async function eliminarGasto(gasto) {
    await gastosViajeService.eliminarGastoViaje(datosUsuario, gasto)
    actualizarGastos((actuales) => actuales.filter((g) => g.id !== gasto.id))
  }

  function abrirCategoria(categoria) {
    setDetalleCategoria({ categoria })
  }

  function abrirSinCategoria() {
    setDetalleCategoria({ categoria: null })
  }

  function volverACategorias() {
    setDetalleCategoria(null)
  }

  const gastosHuerfanos = gastosSinCategoria(gastos)
  const totalesHuerfanos = totalesPorMoneda(gastosHuerfanos)
  const totalesGenerales = totalesPorMoneda(gastos)

  if (detalleCategoria) {
    const gastosDeCategoria = detalleCategoria.categoria
      ? gastos.filter((gasto) => gasto.categoria_viaje_id === detalleCategoria.categoria.id)
      : gastosHuerfanos

    return (
      <DetalleCategoriaViaje
        categoria={detalleCategoria.categoria}
        gastos={gastosDeCategoria}
        categoriasViaje={categorias}
        onVolver={volverACategorias}
        onAgregarGasto={agregarGasto}
        onActualizarGasto={actualizarGasto}
        onEliminarGasto={eliminarGasto}
      />
    )
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center justify-between gap-3">
          <BotonVolver
            onClick={onVolver}
            etiqueta={t('viajes.misViajes')}
            ariaLabel={t('viajes.detalle.volverAria')}
          />
          <button
            type="button"
            onClick={onVerResumen}
            className="shrink-0 rounded-full bg-panel-2 px-3 py-1.5 text-xs font-semibold text-mint"
          >
            {t('viajes.detalle.verResumen')}
          </button>
        </header>

        <section className="superficie-hero flex flex-col gap-4 rounded-2xl p-6 shadow-elevated">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint/15 text-mint">
              <Plane className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-text">{viaje.nombre}</h1>
              {(viaje.origen || viaje.destino) && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-text-dim">
                  {viaje.origen && <span className="truncate">{viaje.origen}</span>}
                  {viaje.origen && viaje.destino && (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  {viaje.destino && <span className="truncate">{viaje.destino}</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-dim">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {textoFechas(viaje, idioma, t)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {tp('viajes.adultosContador', viaje.adultos)}
              {viaje.ninos > 0 ? ` · ${tp('viajes.ninosContador', viaje.ninos)}` : ''}
            </span>
          </div>

          {Object.keys(totalesGenerales).length > 0 && (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-dim">
                {t('viajes.resumen.totalesTitulo')}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(totalesGenerales).map(([moneda, monto]) => (
                  <span
                    key={moneda}
                    className="rounded-full bg-panel-2 px-3 py-1.5 text-xs font-semibold text-text"
                  >
                    {formatearMonto(monto, moneda)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {error && <MensajeError>{t('viajes.detalle.errorCargar')}</MensajeError>}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-semibold text-text">{t('viajes.detalle.categoriasTitulo')}</h2>
              <AyudaContextual
                clave="guia.ayuda.viajeDashboard"
                etiqueta={t('guia.ayuda.viajeDashboardAria')}
              />
            </div>
            <button
              type="button"
              onClick={abrirCrearCategoria}
              className="rounded-full bg-panel-2 px-3 py-1.5 text-xs font-semibold text-mint"
            >
              {t('viajes.detalle.nuevaCategoria')}
            </button>
          </div>

          {cargando && <p className="px-2 text-sm text-text-dim">{t('viajes.detalle.cargandoCategorias')}</p>}

          <MensajeError>{errorEliminarCategoria}</MensajeError>

          {!cargando && !error && categorias.length === 0 && (
            <Tarjeta className="flex flex-col items-center gap-2 p-6 text-center">
              <Tag className="h-6 w-6 text-text-dim" aria-hidden="true" />
              <p className="text-sm text-text-dim">{t('viajes.detalle.sinCategorias')}</p>
            </Tarjeta>
          )}

          {!cargando &&
            !error &&
            categorias.map((categoria) => (
              <TarjetaCategoriaViaje
                key={categoria.id}
                categoria={categoria}
                gastos={gastos}
                eliminando={eliminandoCategoriaId === categoria.id}
                onAbrir={() => abrirCategoria(categoria)}
                onEditar={() => abrirEditarCategoria(categoria)}
                onEliminar={() => eliminarCategoria(categoria)}
              />
            ))}

          {!cargando && !error && gastosHuerfanos.length > 0 && (
            <Tarjeta
              role="button"
              tabIndex={0}
              onClick={abrirSinCategoria}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                  evento.preventDefault()
                  abrirSinCategoria()
                }
              }}
              aria-label={t('viajes.detalle.abrirSinCategoriaAria')}
              className="flex cursor-pointer flex-col gap-1 text-left transition-all duration-150 hover:bg-panel-2 active:scale-[0.99]"
            >
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                <p className="text-sm font-medium text-text">{t('viajes.detalle.gastosSinCategoriaTitulo')}</p>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-text-dim" aria-hidden="true" />
              </div>
              <p className="text-xs text-text-dim">{t('viajes.detalle.gastosSinCategoriaNota')}</p>
              <p className="text-xs text-text-dim">
                {Object.entries(totalesHuerfanos)
                  .map(([moneda, monto]) => formatearMonto(monto, moneda))
                  .join(' · ')}
              </p>
            </Tarjeta>
          )}
        </section>
      </div>

      <HojaNuevaCategoriaViaje
        abierta={hojaCategoriaAbierta}
        categoriaEditando={categoriaEditando}
        onCerrar={cerrarHojaCategoria}
        onGuardar={agregarCategoria}
        onActualizar={actualizarCategoria}
      />

      <BotonAgregar
        onClick={() => setGastoRapidoAbierto(true)}
        etiqueta={t('viajes.detalle.registrarGasto')}
      />

      {/* Mismo criterio que DetalleCategoriaViaje.jsx: crear pasa por el
          asistente con el flag activo, editar (no aplica acá, el FAB nunca
          edita) seguiría por HojaNuevoGastoViaje. Sin
          categoriaPreseleccionadaId -- arranca en el paso de elegir
          categoría (o la salta solo si el viaje tiene una única categoría,
          ver AsistenteGastoViaje.jsx). */}
      {USAR_ASISTENTE_GASTO_VIAJE ? (
        <AsistenteGastoViaje
          abierta={gastoRapidoAbierto}
          onCerrar={() => setGastoRapidoAbierto(false)}
          categorias={categorias}
          onGuardar={agregarGasto}
        />
      ) : (
        <HojaNuevoGastoViaje
          abierta={gastoRapidoAbierto}
          categorias={categorias}
          onCerrar={() => setGastoRapidoAbierto(false)}
          onGuardar={agregarGasto}
          onActualizar={actualizarGasto}
        />
      )}
    </main>
  )
}

export default DetalleViaje
