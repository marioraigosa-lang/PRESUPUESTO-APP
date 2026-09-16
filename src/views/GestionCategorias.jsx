import { useState } from 'react'
import { Pencil, Trash2, ArchiveRestore, Lock } from 'lucide-react'
import HojaCategoria from '../components/HojaCategoria'
import AyudaContextual from '../components/AyudaContextual'
import IconoCategoria from '../components/IconoCategoria'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import { resolverIconoCategoria } from '../utils/resolverIconoCategoria'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

function GestionCategorias({
  categorias,
  cargandoCategorias,
  errorCategorias,
  onVolver,
  onAgregarCategoria,
  onActualizarCategoria,
  onContarMovimientos,
  onEliminarCategoria,
  onArchivarCategoria,
  onDesarchivarCategoria,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [procesandoId, setProcesandoId] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const categoriaSistema = categorias.find((categoria) => categoria.es_sistema)
  // "Gestionables" = todo lo que no es la categoría de sistema (esa siempre
  // se muestra aparte, bloqueada). Separada en activas/archivadas para las
  // dos secciones de abajo -- ver plan de archivado de categorías.
  const categoriasGestionables = categorias.filter((categoria) => !categoria.es_sistema)
  const categoriasActivas = categoriasGestionables.filter((categoria) => !categoria.archivada_en)
  const categoriasArchivadas = categoriasGestionables.filter((categoria) => categoria.archivada_en)

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

  // Decide en el momento (después de consultar el conteo real de
  // movimientos) si esta categoría se puede borrar de verdad o si hay que
  // archivarla -- mismo criterio que ya usaba manejarEliminar antes de
  // reasignar-y-eliminar: no hace falta mostrar dos botones distintos de
  // entrada, el botón único ya explica en su propio diálogo de confirmación
  // cuál de las dos acciones va a pasar.
  async function manejarAccion(categoria) {
    setErrorAccion(null)
    setProcesandoId(categoria.id)

    try {
      const cantidad = await onContarMovimientos(categoria.id)

      if (cantidad === 0) {
        const confirmado = window.confirm(
          t('categorias.gestion.confirmarEliminar', { nombre: categoria.nombre }),
        )
        if (!confirmado) return

        await onEliminarCategoria(categoria)
        return
      }

      const confirmado = window.confirm(
        t('categorias.gestion.confirmarArchivar', { nombre: categoria.nombre }),
      )
      if (!confirmado) return

      await onArchivarCategoria(categoria)
    } catch (error) {
      console.error(error)
      setErrorAccion(t('categorias.gestion.errorAccion'))
    } finally {
      setProcesandoId(null)
    }
  }

  async function manejarDesarchivar(categoria) {
    setErrorAccion(null)

    const confirmado = window.confirm(
      t('categorias.gestion.confirmarDesarchivar', { nombre: categoria.nombre }),
    )
    if (!confirmado) return

    setProcesandoId(categoria.id)
    try {
      await onDesarchivarCategoria(categoria)
    } catch (error) {
      console.error(error)
      setErrorAccion(t('categorias.gestion.errorDesarchivar'))
    } finally {
      setProcesandoId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver onClick={onVolver} ariaLabel={t('categorias.gestion.volverAria')} />
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

        <MensajeError>{errorAccion}</MensajeError>

        {cargandoCategorias && (
          <p className="px-2 text-sm text-text-dim">{t('categorias.gestion.cargando')}</p>
        )}

        {errorCategorias && <MensajeError>{t('categorias.gestion.errorCargar')}</MensajeError>}

        {!cargandoCategorias && !errorCategorias && categoriasGestionables.length === 0 && (
          <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
            {t('categorias.gestion.sinCategorias')}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {categoriasActivas.map((categoria) => (
            <div key={categoria.id} className="flex items-center gap-3 rounded-2xl bg-panel shadow-card p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${categoria.color}26` }}
              >
                <IconoCategoria nombre={resolverIconoCategoria(categoria)} color={categoria.color} size="md" />
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
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => manejarAccion(categoria)}
                  disabled={procesandoId === categoria.id}
                  aria-label={t('categorias.gestion.eliminarAria', { nombre: categoria.nombre })}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-coral/70 hover:bg-panel-2 hover:text-coral disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}

          {categoriaSistema && (
            <div className="flex items-center gap-3 rounded-2xl bg-panel-2 p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${categoriaSistema.color}26` }}
              >
                <IconoCategoria
                  nombre={resolverIconoCategoria(categoriaSistema)}
                  color={categoriaSistema.color}
                  size="md"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-text">{categoriaSistema.nombre}</p>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-line px-2 py-0.5 text-[10px] font-semibold text-text-dim">
                    <Lock className="h-3 w-3" aria-hidden="true" />
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

        {/* Sección "Archivadas": a diferencia de tarjetas (que nunca se
            muestran archivadas en ningún lado), acá sí conviene un lugar
            desde donde desarchivar -- las categorías son estacionales
            (vacaciones, regalos de fin de año...) y el usuario puede querer
            reactivar una que ya usó antes, sin recrearla desde cero y perder
            la continuidad con su historial. Atenuada a propósito: no compite
            visualmente con las activas. */}
        {categoriasArchivadas.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
              {t('categorias.gestion.seccionArchivadas')}
            </h2>
            {categoriasArchivadas.map((categoria) => (
              <div
                key={categoria.id}
                className="flex items-center gap-3 rounded-2xl bg-panel-2 p-4 opacity-70"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${categoria.color}26` }}
                >
                  <IconoCategoria nombre={resolverIconoCategoria(categoria)} color={categoria.color} size="md" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{categoria.nombre}</p>
                  <p className="truncate text-xs text-text-dim">{t('categorias.gestion.archivadaEtiqueta')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => manejarDesarchivar(categoria)}
                  disabled={procesandoId === categoria.id}
                  aria-label={t('categorias.gestion.desarchivarAria', { nombre: categoria.nombre })}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-dim hover:bg-panel hover:text-mint disabled:opacity-60"
                >
                  <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <HojaCategoria
        abierta={hojaAbierta}
        categoriaEditando={categoriaEditando}
        onCerrar={cerrarHoja}
        onGuardar={onAgregarCategoria}
        onActualizar={onActualizarCategoria}
      />
    </main>
  )
}

export default GestionCategorias
