import { useState } from 'react'
import Movimiento from '../components/Movimiento'
import SelectorPeriodo from '../components/SelectorPeriodo'
import HojaNuevoMovimiento from '../components/HojaNuevoMovimiento'
import FilaTotales from '../components/FilaTotales'
import { useIdioma } from '../context/IdiomaContext'
import { useFormatoMoneda } from '../context/MonedaContext'
import { useMovimientosPeriodo } from '../hooks/useMovimientosPeriodo'
import { calcularProgresoPresupuesto } from '../utils/progresoPresupuesto'
import BotonVolver from '../components/ui/BotonVolver'
import MensajeError from '../components/ui/MensajeError'

const hoy = new Date()

// Pantalla de detalle de una categoría de gasto variable puntual (Fase 2 de
// "cuentas y categorías navegables"): se abre al tocar una categoría en
// GastosVariables.jsx (dentro de Home). Mismo molde que DetalleCuenta.jsx
// (Fase 1) y que DetalleViaje.jsx: header con botón volver, tarjeta hero
// con el resumen del mes, selector de mes propio (sin quincena), lista de
// movimientos, y hoja de crear/editar con la categoría preseleccionada.
//
// Los movimientos que llegan acá vienen filtrados por categoria_id (ver
// useMovimientosPeriodo): como categoria_id solo se guarda en movimientos
// tipo "gasto" (los ingresos y traslados nunca la tienen -- ver
// services/movimientos.js), todo lo que trae esta consulta es un gasto
// normal de esta categoría, sin necesidad de filtrar por tipo.
function DetalleCategoria({
  categoria,
  cuentas,
  categorias,
  movimientosVersion,
  onVolver,
  onAgregarMovimiento,
  onActualizarMovimiento,
  onEliminarMovimiento,
}) {
  const { t } = useIdioma()
  const formatear = useFormatoMoneda()

  const [periodo, setPeriodo] = useState({ mes: hoy.getMonth(), anio: hoy.getFullYear() })
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [movimientoEditando, setMovimientoEditando] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [errorEliminar, setErrorEliminar] = useState(null)

  const {
    datos: movimientos,
    cargando: cargandoMovimientos,
    error: errorMovimientos,
    establecerDatos: setMovimientos,
  } = useMovimientosPeriodo({ periodo, version: movimientosVersion, categoriaId: categoria.id })

  const gastado = movimientos.reduce((suma, movimiento) => suma + movimiento.monto, 0)
  const { tieneTope, excedido, porcentaje } = calcularProgresoPresupuesto(categoria.presupuesto, gastado)
  const restante = categoria.presupuesto - gastado
  const colorBarra = excedido ? 'var(--color-coral)' : categoria.color

  const itemsTotales = tieneTope
    ? [
        {
          etiqueta: t('categorias.detalle.presupuestoTitulo'),
          montoTexto: formatear(categoria.presupuesto),
          colorPunto: categoria.color,
          colorTexto: 'text-text',
        },
        {
          etiqueta: t('categorias.detalle.gastadoTitulo'),
          montoTexto: formatear(gastado),
          colorPunto: categoria.color,
          colorTexto: 'text-text',
        },
        {
          etiqueta: t('categorias.detalle.restanteTitulo'),
          montoTexto: formatear(restante),
          colorPunto: restante >= 0 ? 'var(--color-mint)' : 'var(--color-coral)',
          colorTexto: restante >= 0 ? 'text-mint' : 'text-coral',
        },
      ]
    : [
        {
          etiqueta: t('categorias.detalle.gastadoTitulo'),
          montoTexto: formatear(gastado),
          colorPunto: categoria.color,
          colorTexto: 'text-text',
        },
      ]

  function irMesAnterior() {
    setPeriodo((actual) => {
      const esEnero = actual.mes === 0
      return { mes: esEnero ? 11 : actual.mes - 1, anio: esEnero ? actual.anio - 1 : actual.anio }
    })
  }

  function irMesSiguiente() {
    setPeriodo((actual) => {
      const esDiciembre = actual.mes === 11
      return { mes: esDiciembre ? 0 : actual.mes + 1, anio: esDiciembre ? actual.anio + 1 : actual.anio }
    })
  }

  function abrirNuevoGasto() {
    setMovimientoEditando(null)
    setHojaAbierta(true)
  }

  function abrirEditarMovimiento(movimiento) {
    if (movimiento.gasto_fijo_id) return
    setMovimientoEditando(movimiento)
    setHojaAbierta(true)
  }

  function cerrarHoja() {
    setHojaAbierta(false)
    setMovimientoEditando(null)
  }

  async function manejarEliminar(movimiento) {
    if (movimiento.gasto_fijo_id) return

    const confirmado = window.confirm(
      t('home.confirmarEliminarMovimiento', { descripcion: movimiento.descripcion }),
    )
    if (!confirmado) return

    setErrorEliminar(null)
    setEliminandoId(movimiento.id)

    try {
      await onEliminarMovimiento(movimiento)
      setMovimientos((actuales) => actuales.filter((m) => m.id !== movimiento.id))
    } catch (error) {
      console.error(error)
      setErrorEliminar(true)
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto flex max-w-[460px] flex-col gap-6 pb-28">
        <header className="flex items-center gap-3">
          <BotonVolver
            onClick={onVolver}
            etiqueta={t('nav.inicio')}
            ariaLabel={t('categorias.detalle.volverAria')}
          />
        </header>

        <section className="superficie-hero flex flex-col gap-4 rounded-2xl p-5 shadow-elevated">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ backgroundColor: `${categoria.color}26` }}
            >
              {categoria.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-text">{categoria.nombre}</h1>
              {categoria.descripcion && (
                <p className="truncate text-xs text-text-dim">{categoria.descripcion}</p>
              )}
            </div>
          </div>

          {tieneTope && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${porcentaje}%`, backgroundColor: colorBarra }}
              />
            </div>
          )}

          <div className="border-t border-line pt-4">
            <FilaTotales items={itemsTotales} />
          </div>
        </section>

        <SelectorPeriodo
          periodo={periodo}
          onMesAnterior={irMesAnterior}
          onMesSiguiente={irMesSiguiente}
          mostrarQuincena={false}
        />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
              {t('categorias.detalle.gastosTitulo')}
            </h2>
            <button
              type="button"
              onClick={abrirNuevoGasto}
              className="text-xs font-semibold text-mint"
            >
              {t('categorias.detalle.nuevoGasto')}
            </button>
          </div>

          {cargandoMovimientos && (
            <p className="px-2 text-sm text-text-dim">{t('home.cargandoMovimientos')}</p>
          )}

          {errorMovimientos && <MensajeError>{t('home.errorCargarMovimientos')}</MensajeError>}

          {errorEliminar && <MensajeError>{t('home.errorEliminarMovimiento')}</MensajeError>}

          {!cargandoMovimientos && !errorMovimientos && movimientos.length === 0 && (
            <p className="rounded-2xl bg-panel p-4 text-sm text-text-dim">
              {t('categorias.detalle.sinGastos')}
            </p>
          )}

          {!cargandoMovimientos && !errorMovimientos && movimientos.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-panel shadow-card p-2">
              {movimientos.map((movimiento) => (
                <Movimiento
                  key={movimiento.id}
                  movimiento={movimiento}
                  eliminando={eliminandoId === movimiento.id}
                  onEditar={() => abrirEditarMovimiento(movimiento)}
                  onEliminar={() => manejarEliminar(movimiento)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <HojaNuevoMovimiento
        abierta={hojaAbierta}
        onCerrar={cerrarHoja}
        cuentas={cuentas}
        categorias={categorias}
        categoriaPreseleccionadaId={categoria.id}
        onGuardar={onAgregarMovimiento}
        onActualizar={(datos) => onActualizarMovimiento(movimientoEditando, datos)}
        movimientoEditando={movimientoEditando}
      />
    </main>
  )
}

export default DetalleCategoria
