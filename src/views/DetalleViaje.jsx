import { useState } from 'react'
import TarjetaCategoriaViaje from '../components/TarjetaCategoriaViaje'
import HojaNuevaCategoriaViaje from '../components/HojaNuevaCategoriaViaje'
import GastoViaje from '../components/GastoViaje'
import HojaNuevoGastoViaje from '../components/HojaNuevoGastoViaje'
import AyudaContextual from '../components/AyudaContextual'
import { textoTrayecto, textoFechas } from '../components/TarjetaViaje'
import { useIdioma } from '../context/IdiomaContext'
import { useDatosUsuario } from '../lib/datosUsuario'
import { useConsulta } from '../hooks/useConsulta'
import * as categoriasViajeService from '../services/categoriasViaje'
import * as gastosViajeService from '../services/gastosViaje'
import { formatearMonto } from '../utils/formatoMoneda'
import { gastosSinCategoria, totalesPorMoneda } from '../utils/resumenViaje'

const DATOS_INICIALES = { categorias: [], gastos: [] }

// Pantalla autosuficiente, igual que Viajes.jsx: carga sus propias
// categorías y gastos con useDatosUsuario + useConsulta (en una sola
// consulta con Promise.all, para compartir un mismo cargando/error). Recibe
// el "viaje" y "onVolver" de Viajes.jsx, que es quien controla la
// navegación lista/detalle (Fase 2 de "Planifica tus viajes").
//
// Solo muestra el presupuesto de cada categoría y el listado crudo de
// gastos -- el dashboard presupuestado vs. ejecutado es la Fase 4.
function DetalleViaje({ viaje, onVolver, onVerResumen }) {
  const datosUsuario = useDatosUsuario()
  const { seleccionarPropio } = datosUsuario
  const { idioma, t, tp } = useIdioma()

  const [hojaCategoriaAbierta, setHojaCategoriaAbierta] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [eliminandoCategoriaId, setEliminandoCategoriaId] = useState(null)
  const [errorEliminarCategoria, setErrorEliminarCategoria] = useState(null)

  const [hojaGastoAbierta, setHojaGastoAbierta] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)
  const [eliminandoGastoId, setEliminandoGastoId] = useState(null)
  const [errorEliminarGasto, setErrorEliminarGasto] = useState(null)

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
      setErrorEliminarCategoria(t('viajes.detalle.errorEliminarCategoria') + err.message)
    } finally {
      setEliminandoCategoriaId(null)
    }
  }

  function abrirCrearGasto() {
    setGastoEditando(null)
    setHojaGastoAbierta(true)
  }

  function abrirEditarGasto(gasto) {
    setGastoEditando(gasto)
    setHojaGastoAbierta(true)
  }

  function cerrarHojaGasto() {
    setHojaGastoAbierta(false)
    setGastoEditando(null)
  }

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
    const descripcion = gasto.descripcion?.trim() || t('viajes.detalle.gastoSinDescripcion')
    const confirmado = window.confirm(t('viajes.detalle.confirmarEliminarGasto', { descripcion }))
    if (!confirmado) return

    setErrorEliminarGasto(null)
    setEliminandoGastoId(gasto.id)

    try {
      await gastosViajeService.eliminarGastoViaje(datosUsuario, gasto)
      actualizarGastos((actuales) => actuales.filter((g) => g.id !== gasto.id))
    } catch (err) {
      setErrorEliminarGasto(t('viajes.detalle.errorEliminarGasto') + err.message)
    } finally {
      setEliminandoGastoId(null)
    }
  }

  const trayecto = textoTrayecto(viaje)
  const gastosHuerfanos = gastosSinCategoria(gastos)
  const totalesHuerfanos = totalesPorMoneda(gastosHuerfanos)

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label={t('viajes.detalle.volverAria')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ←
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-text">{viaje.nombre}</h1>
            {trayecto && <p className="truncate text-xs text-text-dim">{trayecto}</p>}
          </div>
          <button
            type="button"
            onClick={onVerResumen}
            className="shrink-0 rounded-full bg-panel-2 px-3 py-1.5 text-xs font-semibold text-mint"
          >
            {t('viajes.detalle.verResumen')}
          </button>
        </header>

        <section className="flex flex-col gap-1 rounded-2xl bg-panel p-4">
          <p className="text-xs text-text-dim">{textoFechas(viaje, idioma, t)}</p>
          <p className="text-xs text-text-dim">
            {tp('viajes.adultosContador', viaje.adultos)}
            {viaje.ninos > 0 ? ` · ${tp('viajes.ninosContador', viaje.ninos)}` : ''}
          </p>
        </section>

        {error && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

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

          {errorEliminarCategoria && (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorEliminarCategoria}</p>
          )}

          {!cargando && !error && categorias.length === 0 && (
            <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">{t('viajes.detalle.sinCategorias')}</p>
          )}

          {!cargando &&
            !error &&
            categorias.map((categoria) => (
              <TarjetaCategoriaViaje
                key={categoria.id}
                categoria={categoria}
                gastos={gastos}
                eliminando={eliminandoCategoriaId === categoria.id}
                onEditar={() => abrirEditarCategoria(categoria)}
                onEliminar={() => eliminarCategoria(categoria)}
              />
            ))}

          {!cargando && !error && gastosHuerfanos.length > 0 && (
            <div className="flex flex-col gap-1 rounded-2xl bg-panel p-4">
              <p className="text-sm font-medium text-text">{t('viajes.detalle.gastosSinCategoriaTitulo')}</p>
              <p className="text-xs text-text-dim">{t('viajes.detalle.gastosSinCategoriaNota')}</p>
              <p className="text-xs text-text-dim">
                {Object.entries(totalesHuerfanos)
                  .map(([moneda, monto]) => formatearMonto(monto, moneda))
                  .join(' · ')}
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">{t('viajes.detalle.gastosTitulo')}</h2>
            <button
              type="button"
              onClick={abrirCrearGasto}
              className="rounded-full bg-panel-2 px-3 py-1.5 text-xs font-semibold text-mint"
            >
              {t('viajes.detalle.nuevoGasto')}
            </button>
          </div>

          {cargando && <p className="px-2 text-sm text-text-dim">{t('viajes.detalle.cargandoGastos')}</p>}

          {errorEliminarGasto && (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorEliminarGasto}</p>
          )}

          {!cargando && !error && gastos.length === 0 && (
            <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">{t('viajes.detalle.sinGastos')}</p>
          )}

          {!cargando &&
            !error &&
            gastos.map((gasto) => (
              <GastoViaje
                key={gasto.id}
                gasto={gasto}
                categoria={categorias.find((c) => c.id === gasto.categoria_viaje_id)}
                eliminando={eliminandoGastoId === gasto.id}
                onEditar={() => abrirEditarGasto(gasto)}
                onEliminar={() => eliminarGasto(gasto)}
              />
            ))}
        </section>
      </div>

      <HojaNuevaCategoriaViaje
        abierta={hojaCategoriaAbierta}
        categoriaEditando={categoriaEditando}
        onCerrar={cerrarHojaCategoria}
        onGuardar={agregarCategoria}
        onActualizar={actualizarCategoria}
      />

      <HojaNuevoGastoViaje
        abierta={hojaGastoAbierta}
        gastoEditando={gastoEditando}
        categorias={categorias}
        onCerrar={cerrarHojaGasto}
        onGuardar={agregarGasto}
        onActualizar={actualizarGasto}
      />
    </main>
  )
}

export default DetalleViaje
