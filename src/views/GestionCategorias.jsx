import { useState } from 'react'
import HojaCategoria from '../components/HojaCategoria'
import HojaReasignarCategoria from '../components/HojaReasignarCategoria'
import AyudaContextual from '../components/AyudaContextual'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'

function GestionCategorias({
  categorias,
  cargandoCategorias,
  errorCategorias,
  onVolver,
  onAgregarCategoria,
  onActualizarCategoria,
  onContarMovimientos,
  onEliminarCategoria,
  onReasignarYEliminarCategoria,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const [hojaReasignarAbierta, setHojaReasignarAbierta] = useState(false)
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null)
  const [cantidadMovimientos, setCantidadMovimientos] = useState(0)

  const categoriaSistema = categorias.find((categoria) => categoria.es_sistema)
  const categoriasGestionables = categorias.filter((categoria) => !categoria.es_sistema)

  function abrirCrear() {
    setCategoriaEditando(null)
    setHojaAbierta(true)
  }

  function abrirEditar(categoria) {
    setCategoriaEditando(categoria)
    setHojaAbierta(true)
  }

  function cerrarHoja() {
    setHojaAbierta(false)
    setCategoriaEditando(null)
  }

  function cerrarHojaReasignar() {
    setHojaReasignarAbierta(false)
    setCategoriaAEliminar(null)
  }

  async function manejarEliminar(categoria) {
    setErrorAccion(null)
    setEliminandoId(categoria.id)

    try {
      const cantidad = await onContarMovimientos(categoria.id)

      if (cantidad > 0) {
        setCantidadMovimientos(cantidad)
        setCategoriaAEliminar(categoria)
        setHojaReasignarAbierta(true)
        return
      }

      const confirmado = window.confirm(
        t('categorias.gestion.confirmarEliminar', { nombre: categoria.nombre }),
      )
      if (!confirmado) return

      await onEliminarCategoria(categoria)
    } catch (error) {
      setErrorAccion(t('categorias.gestion.errorEliminar') + error.message)
    } finally {
      setEliminandoId(null)
    }
  }

  async function manejarConfirmarReasignar(categoriaDestinoId) {
    await onReasignarYEliminarCategoria(categoriaAEliminar, categoriaDestinoId)
    cerrarHojaReasignar()
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            aria-label={t('categorias.gestion.volverAria')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-text"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text">{t('categorias.gestion.titulo')}</h1>
            <p className="text-xs text-text-dim">{t('categorias.gestion.subtitulo')}</p>
          </div>
        </header>

        <button
          type="button"
          onClick={abrirCrear}
          className="w-full rounded-2xl bg-mint py-3 text-sm font-semibold text-bg"
        >
          {t('categorias.gestion.agregarCategoria')}
        </button>

        {errorAccion && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{errorAccion}</p>
        )}

        {cargandoCategorias && (
          <p className="px-2 text-sm text-text-dim">{t('categorias.gestion.cargando')}</p>
        )}

        {errorCategorias && (
          <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {t('categorias.gestion.errorCargar')}
            {errorCategorias}
          </p>
        )}

        {!cargandoCategorias && !errorCategorias && categoriasGestionables.length === 0 && (
          <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
            {t('categorias.gestion.sinCategorias')}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {categoriasGestionables.map((categoria) => (
            <div key={categoria.id} className="flex items-center gap-3 rounded-2xl bg-panel p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: `${categoria.color}26` }}
              >
                {categoria.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{categoria.nombre}</p>
                {categoria.descripcion && (
                  <p className="truncate text-xs text-text-dim/80">{categoria.descripcion}</p>
                )}
                <p className="truncate text-xs text-text-dim">
                  {categoria.presupuesto
                    ? t('categorias.gestion.topeMensual', { monto: formatear(categoria.presupuesto) })
                    : t('categorias.gestion.sinTopeDefinido')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => abrirEditar(categoria)}
                  aria-label={t('categorias.gestion.editarAria', { nombre: categoria.nombre })}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-mint"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => manejarEliminar(categoria)}
                  disabled={eliminandoId === categoria.id}
                  aria-label={t('categorias.gestion.eliminarAria', { nombre: categoria.nombre })}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-text-dim hover:bg-panel-2 hover:text-coral disabled:opacity-60"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}

          {categoriaSistema && (
            <div className="flex items-center gap-3 rounded-2xl bg-panel-2 p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: `${categoriaSistema.color}26` }}
              >
                {categoriaSistema.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text">{categoriaSistema.nombre}</p>
                  <span className="shrink-0 rounded-full bg-line px-2 py-0.5 text-[10px] font-semibold text-text-dim">
                    {t('categorias.gestion.sistemaEtiqueta')}
                  </span>
                  <AyudaContextual
                    clave="guia.ayuda.categoriaSistema"
                    etiqueta={t('guia.ayuda.categoriaSistemaAria')}
                  />
                </div>
                <p className="truncate text-xs text-text-dim">
                  {t('categorias.gestion.sistemaDescripcion')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <HojaCategoria
        abierta={hojaAbierta}
        categoriaEditando={categoriaEditando}
        onCerrar={cerrarHoja}
        onGuardar={onAgregarCategoria}
        onActualizar={onActualizarCategoria}
      />

      <HojaReasignarCategoria
        abierta={hojaReasignarAbierta}
        categorias={categoriasGestionables}
        categoria={categoriaAEliminar}
        cantidadMovimientos={cantidadMovimientos}
        onCerrar={cerrarHojaReasignar}
        onConfirmar={manejarConfirmarReasignar}
      />
    </main>
  )
}

export default GestionCategorias
